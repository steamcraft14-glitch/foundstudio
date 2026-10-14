"""Pruebas del sitio foundstudio.cl (rediseño octubre 2026).

Uso, desde la carpeta del repo:
    python -m http.server 8417 --bind 127.0.0.1      (en otra terminal)
    python tests/qa.py

Necesita Playwright para Python (pip install playwright && python -m playwright install chromium).
El formulario NUNCA se envía de verdad: las llamadas a Web3Forms se interceptan y se responden aquí.
"""
import json
import re
import sys
from urllib.parse import urljoin

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8417"
PAGES = ["/", "/servicios/", "/ejemplos/", "/contacto/", "/brief/", "/privacidad.html", "/404.html"]
results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("OK   " if ok else "FALLA") + f"  {name}" + (f"  ({detail})" if detail and not ok else ""))


def watch(page):
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    return errors


with sync_playwright() as p:
    browser = p.chromium.launch()

    # 1. cada página carga sin errores, sin bloqueos de CSP y sin scroll lateral
    for w, h in [(1440, 900), (390, 844)]:
        for path in PAGES:
            page = browser.new_page(viewport={"width": w, "height": h})
            errors = watch(page)
            res = page.goto(BASE + path, wait_until="networkidle")
            check(f"{path} @{w}: responde 200", res.status == 200, res.status)
            page.wait_for_timeout(300)
            check(f"{path} @{w}: sin errores en consola", not errors, "; ".join(errors)[:200])
            over = page.evaluate("document.documentElement.scrollWidth - innerWidth")
            check(f"{path} @{w}: sin scroll lateral", over <= 1, f"{over}px")
            if path != "/404.html":
                check(f"{path} @{w}: un solo h1", page.locator("h1").count() == 1)
            page.close()

    # 2. enlaces internos y recursos sin 404
    page = browser.new_page()
    seen, broken = set(), []
    for path in PAGES[:-1]:
        page.goto(BASE + path, wait_until="networkidle")
        urls = page.evaluate("""[...document.querySelectorAll('a[href], img[src], link[href], script[src], video[src], video[poster]')]
            .map(e => e.getAttribute('href') || e.getAttribute('src') || e.getAttribute('poster'))""")
        urls += page.evaluate("[...document.querySelectorAll('img[srcset]')].flatMap(i => i.srcset.split(',').map(s => s.trim().split(' ')[0]))")
        for u in urls:
            if not u or u.startswith(("http", "mailto:", "tel:", "#", "data:")):
                continue
            full = urljoin(BASE + path, u).split("#")[0]
            if full in seen:
                continue
            seen.add(full)
            r = page.request.get(full)
            if r.status != 200:
                broken.append(f"{u} en {path} → {r.status}")
    check(f"enlaces internos y recursos ({len(seen)})", not broken, "; ".join(broken)[:300])
    gc = [pth for pth in PAGES if pth != "/brief/" and (page.goto(BASE + pth) and page.locator("script[data-goatcounter='https://foundstudio.goatcounter.com/count']").count() != 1)]
    check("visitas: GoatCounter en todas las páginas públicas", not gc, ", ".join(gc))
    wa = page.evaluate("[...document.querySelectorAll('a[href*=\"wa.me\"]')].map(a => a.href)")
    check("WhatsApp apunta al número correcto", wa and all("wa.me/56942579133" in u for u in wa))
    page.close()

    # 3. inicio: pasos que responden al toque y tarjeta "próximamente"
    page = browser.new_page()
    page.goto(BASE + "/", wait_until="networkidle")
    page.click(".steps li:nth-child(2)")
    check("pasos: se resaltan al tocar", "is-on" in page.get_attribute(".steps li:nth-child(2)", "class"))
    page.click(".case-soon .btn")
    check("próximamente: abre el asistente", page.is_visible(".chat-panel"))
    check("portada: sin precios fijos", "190" not in page.inner_text("body"))
    page.close()

    # 3b. lo que te solicitamos: la carpeta abre el PDF y no hay brief dentro de la página
    page = browser.new_page(viewport={"width": 390, "height": 844})
    page.goto(BASE + "/", wait_until="networkidle")
    check("brief: la carpeta apunta al PDF", page.get_attribute(".folder", "href") == "/assets/docs/brief-found-studio.pdf")
    check("brief: carpeta sin etiqueta repetida", page.locator(".folder-label").count() == 0)
    check("brief: no se muestra dentro de la página", page.locator(".doc-sec").count() == 0)
    r = page.request.get(BASE + "/assets/docs/brief-found-studio.pdf")
    check("brief: el PDF se descarga", r.status == 200 and r.body()[:4] == b"%PDF")
    page.close()

    # 4. ejemplos: los seis rubros se dibujan y responden
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = watch(page)
    page.goto(BASE + "/ejemplos/?rubro=barberia", wait_until="networkidle")
    check("ejemplos: abre el rubro del enlace", page.get_attribute("#tab-barberia", "aria-selected") == "true")
    page.click(".phone-screen [data-hora='10:45']")
    page.click(".phone-screen [data-agendar]")
    page.click(".phone-screen [data-dia='Mañana']")
    page.click(".phone-screen [data-dia='Hoy']")
    check("barbería: la hora agendada queda ocupada", page.is_disabled(".phone-screen [data-hora='10:45']"))
    page.click("#tab-botilleria")
    for _ in range(5):
        page.click(".phone-screen [data-vender='3']")
    check("botillería: avisa agotado y bloquea la venta",
          "Agotado" in page.inner_text(".phone-screen [data-s='3']") and page.is_disabled(".phone-screen [data-vender='3']"))
    for rid in ["restaurante", "almacen", "eventos", "construccion"]:
        page.click(f"#tab-{rid}")
        check(f"ejemplos: {rid} se dibuja", page.locator(".phone-screen .d-head").count() == 1)
    page.click("#tab-almacen")
    page.click(".phone-screen [data-i='2'][data-d='1']")
    check("almacén: suma al total", page.inner_text(".phone-screen [data-total]") == "$3.800")
    page.click("#tab-restaurante")
    page.keyboard.press("ArrowRight")
    check("pestañas: se navegan con flechas", page.get_attribute("#tab-barberia", "aria-selected") == "true")
    check("ejemplos: sin errores", not errors, "; ".join(errors)[:200])
    page.close()

    # 5. menú en celular
    page = browser.new_page(viewport={"width": 390, "height": 844})
    page.goto(BASE + "/servicios/", wait_until="networkidle")
    page.click(".menu-btn")
    check("menú celular: se abre", page.is_visible("#menu a[href='/ejemplos/']"))
    page.keyboard.press("Escape")
    check("menú celular: se cierra con Escape", not page.is_visible("#menu a[href='/ejemplos/']"))
    page.close()

    # 6b. asistente de estimado: una conversación completa
    page = browser.new_page(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
    errors = watch(page)
    page.goto(BASE + "/servicios/", wait_until="networkidle")
    page.click(".chat-fab")
    panel = page.locator(".chat-panel")
    check("asistente: se abre el panel", panel.is_visible())
    panel.get_by_role("button", name="Tengo una pregunta").click()
    panel.get_by_role("button", name="¿Incluye el dominio?").click()
    panel.get_by_role("button", name="Otra pregunta").wait_for(timeout=5000)
    check("asistente: responde preguntas frecuentes", "NIC Chile" in panel.locator(".chat-log").inner_text())
    panel.get_by_role("button", name="Calcular un estimado").click()
    for label in ["Barbería o belleza", "Una página web", "Una página con lo esencial"]:
        panel.get_by_role("button", name=label, exact=True).click()
    check("asistente: sugiere reservas para barbería", panel.get_by_role("button", name="Reservas o agenda").get_attribute("aria-pressed") == "true")
    panel.get_by_role("button", name="Listo").click()
    panel.get_by_role("button", name="Sí, ya tengo").click()
    panel.get_by_role("button", name="Sin apuro").click()
    panel.locator(".estimate").wait_for(timeout=5000)
    check("asistente: calcula el rango (150-230 + 60-120)", panel.locator(".estimate .range").inner_text() == "$210.000 a $350.000", panel.locator(".estimate .range").inner_text())
    wa = panel.get_by_role("link", name="Enviar por WhatsApp").get_attribute("href")
    check("asistente: el WhatsApp lleva el resumen", "wa.me/56942579133" in wa and "Estimado" in wa)
    cot = panel.get_by_role("link", name="Pedir cotización formal").get_attribute("href")
    page.goto(BASE + cot, wait_until="networkidle")
    check("asistente: el resumen llega al formulario", "Página web para barbería" in page.input_value("#f-msg") and page.input_value("#f-rubro") == "barberia")
    check("asistente: sin errores", not errors, "; ".join(errors)[:200])
    page.close()

    # 6. formulario: validación, envío simulado y plan B por WhatsApp
    sent = []

    def fake_ok(route):
        sent.append(json.loads(route.request.post_data))
        route.fulfill(status=200, content_type="application/json", body='{"success": true}')

    page = browser.new_page()
    page.route("https://api.web3forms.com/**", fake_ok)
    page.goto(BASE + "/contacto/?rubro=barberia&servicio=pagina", wait_until="networkidle")
    check("formulario: rellena rubro y servicio del enlace",
          page.input_value("#f-rubro") == "barberia" and page.input_value("#f-servicio") == "pagina")
    page.click("#cotizar button[type=submit]")
    check("formulario: vacío no se envía", not sent)
    check("formulario: enfoca el primer error", page.evaluate("document.activeElement.id") == "f-nombre")
    page.fill("#f-nombre", "Camila Prueba")
    page.fill("#f-negocio", "Barbería de prueba")
    page.fill("#f-tel", "+56 9 1111 2222")
    page.click("#cotizar button[type=submit]")
    check("formulario: sin consentimiento no se envía", not sent)
    page.check("#f-consent")
    page.click("#cotizar button[type=submit]")
    page.wait_for_selector("#f-status[data-kind='ok']", timeout=4000)
    key = sent[0].get("access_key", "") if sent else ""
    check("formulario: se envía con clave real", bool(re.fullmatch(r"[0-9a-f-]{36}", key)))
    check("formulario: registra el consentimiento", sent and "versión" in sent[0].get("consentimiento", ""))
    page.close()

    page = browser.new_page()
    page.route("https://api.web3forms.com/**", lambda r: r.fulfill(status=500, body="{}"))
    page.goto(BASE + "/contacto/", wait_until="networkidle")
    page.fill("#f-nombre", "Camila Prueba")
    page.fill("#f-negocio", "Almacén de prueba")
    page.fill("#f-email", "camila@ejemplo.cl")
    page.check("#f-consent")
    page.click("#cotizar button[type=submit]")
    page.wait_for_selector("#f-status[data-kind='error'] a", timeout=4000)
    check("formulario: si falla ofrece WhatsApp con los datos",
          "Almac" in page.get_attribute("#f-status a", "href"))
    page.close()

    # 7. brief en línea: enlace personalizado, secciones según el proyecto, borrador y envío simulado
    sent = []
    page = browser.new_page(viewport={"width": 390, "height": 844})
    errors = watch(page)
    page.route("https://api.web3forms.com/**", fake_ok)
    page.goto(BASE + "/brief/?negocio=Barbería%20Prueba&nombre=Juan&servicio=pagina", wait_until="networkidle")
    check("brief: no carga el contador de visitas", page.locator("script[data-goatcounter]").count() == 0)
    check("brief: no se indexa", "noindex" in (page.get_attribute("meta[name=robots]", "content") or ""))
    check("brief: rellena negocio y nombre del enlace", page.input_value("#b-negocio") == "Barbería Prueba" and page.input_value("#b-nombre") == "Juan")
    check("brief: saluda al negocio", "Barbería Prueba" in page.inner_text("#b-hola"))
    check("brief: página web oculta tienda y sistema", page.is_hidden("#s-tienda") and page.is_hidden("#s-sistema"))
    page.select_option("#b-tipo", "tienda")
    check("brief: tienda muestra su sección", page.is_visible("#s-tienda") and page.is_hidden("#s-sistema"))
    page.fill("#b-servicios", "Corte clásico · $8.000")
    page.click("text=Comprar en línea")
    page.fill("#b-despacho", "Retiro en el local")
    page.wait_for_timeout(800)
    page.reload(wait_until="networkidle")
    check("brief: el borrador sobrevive a recargar",
          page.input_value("#b-servicios") == "Corte clásico · $8.000" and page.is_checked("input[value='Comprar en línea']") and page.is_visible("#b-draft"))
    page.select_option("#b-tipo", "pagina")
    page.click("#brief-form button[type=submit]")
    check("brief: sin contacto ni aceptación no se envía", not sent)
    check("brief: enfoca el primer error", page.evaluate("document.activeElement.id") == "b-tel")
    page.fill("#b-tel", "+56 9 1111 2222")
    page.check("#b-consent")
    page.click("#brief-form button[type=submit]")
    page.wait_for_selector("#b-status[data-kind='ok']", timeout=4000)
    body = sent[0] if sent else {}
    check("brief: llega con asunto, respuestas y consentimiento",
          body.get("subject") == "Brief: Barbería Prueba" and body.get("Servicios o productos") == "Corte clásico · $8.000"
          and body.get("Acción buscada") == "Comprar en línea" and "versión" in body.get("consentimiento", ""))
    check("brief: no envía la sección oculta", "Tienda: despacho" not in body)
    check("brief: ofrece mandar fotos por WhatsApp", "wa.me/56942579133" in (page.get_attribute("#b-status a", "href") or ""))
    check("brief: borra el borrador al enviar", page.evaluate("localStorage.getItem('found-brief-v1')") is None)
    check("brief: sin errores", not errors, "; ".join(errors)[:200])
    page.close()

    page = browser.new_page()
    page.route("https://api.web3forms.com/**", lambda r: r.fulfill(status=500, body="{}"))
    page.goto(BASE + "/brief/", wait_until="networkidle")
    page.fill("#b-nombre", "Camila")
    page.fill("#b-negocio", "Almacén de prueba")
    page.fill("#b-email", "camila@ejemplo.cl")
    page.check("#b-consent")
    page.wait_for_timeout(800)
    page.click("#brief-form button[type=submit]")
    page.wait_for_selector("#b-status[data-kind='error'] a", timeout=4000)
    check("brief: si falla, conserva el borrador y ofrece WhatsApp",
          page.evaluate("localStorage.getItem('found-brief-v1')") is not None and "Almac" in page.get_attribute("#b-status a", "href"))
    page.close()

    browser.close()

bad = [r for r in results if not r[1]]
print(f"\n{len(results) - len(bad)}/{len(results)} pruebas OK")
sys.exit(1 if bad else 0)
