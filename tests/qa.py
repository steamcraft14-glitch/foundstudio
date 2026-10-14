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
PAGES = ["/", "/ejemplos/", "/precios/", "/contacto/", "/privacidad.html", "/404.html"]
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
    wa = page.evaluate("[...document.querySelectorAll('a[href*=\"wa.me\"]')].map(a => a.href)")
    check("WhatsApp apunta al número correcto", wa and all("wa.me/56942579133" in u for u in wa))
    page.close()

    # 3. inicio: el buscador cambia con lo que se escribe
    page = browser.new_page()
    page.goto(BASE + "/", wait_until="networkidle")
    page.fill("#busca", "almacén en Conchalí")
    check("buscador: cambia el dominio", page.inner_text("#r404-title") == "almacenconchali.cl", page.inner_text("#r404-title"))
    check("buscador: detecta el rubro", "rubro=almacen" in page.get_attribute("#rok-cta", "href"))
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
    page.goto(BASE + "/precios/", wait_until="networkidle")
    page.click(".menu-btn")
    check("menú celular: se abre", page.is_visible("#menu a[href='/ejemplos/']"))
    page.keyboard.press("Escape")
    check("menú celular: se cierra con Escape", not page.is_visible("#menu a[href='/ejemplos/']"))
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

    browser.close()

bad = [r for r in results if not r[1]]
print(f"\n{len(results) - len(bad)}/{len(results)} pruebas OK")
sys.exit(1 if bad else 0)
