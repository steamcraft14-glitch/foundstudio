"""Pruebas del portal de clientes (/mi-proyecto/), del panel (/panel/) y de lo que el sitio guarda en Supabase.

Uso, desde la carpeta del repo (con el servidor local corriendo, igual que qa.py):
    python tests/portal_qa.py

Supabase NUNCA se llama de verdad: todas las llamadas a *.supabase.co se interceptan y se responden aquí,
con una sesión falsa guardada en el navegador. Los permisos reales de la base de datos se prueban aparte
(tests/rls.mjs, ver docs/PORTAL.md).
"""
import json
import re
import sys
import time
from urllib.parse import urlparse, parse_qs

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8417"
SB = "https://qwmxzaeyhqdwndijquab.supabase.co"
PID = "11111111-1111-1111-1111-111111111111"
results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("OK   " if ok else "FALLA") + f"  {name}" + (f"  ({detail})" if detail and not ok else ""))


def sesion_falsa(email):
    return json.dumps({
        "access_token": "falso", "refresh_token": "falso", "token_type": "bearer",
        "expires_in": 3600, "expires_at": int(time.time()) + 3600,
        "user": {"id": "00000000-0000-0000-0000-00000000000a", "email": email, "aud": "authenticated", "role": "authenticated"},
    })


def _clave(valor):
    """Sirve site.js con la clave anon reemplazada (la real nunca llega a las pruebas)."""
    def servir(route):
        r = route.fetch()
        route.fulfill(response=r, body=re.sub(r'SUPABASE_ANON_KEY: "[^"]*"', f'SUPABASE_ANON_KEY: "{valor}"', r.text(), count=1))
    return servir


con_clave = _clave("clave-anon-de-prueba")
sin_clave = _clave("")


class FalsoSupabase:
    def __init__(self, admin=False):
        self.admin = admin
        self.llamadas = []
        self.archivos = []
        self.brief = {"proyecto_id": PID, "respuestas": {"Nombre": "Ana Pérez", "Negocio": "Panadería Ana", "Proyecto": "tienda"},
                      "actualizado_at": "2026-10-14T12:00:00Z", "enviado_at": None}
        self.proyecto = {"id": PID, "created_at": "2026-10-10T12:00:00Z", "actualizado_at": "2026-10-14T12:00:00Z",
                         "cliente_id": "00000000-0000-0000-0000-00000000000a", "cliente_nombre": "Ana Pérez",
                         "cliente_email": "ana@ejemplo.cl", "cliente_telefono": "+56 9 1111 2222", "negocio": "Panadería Ana",
                         "servicio": "tienda", "estado": "brief", "url_publicada": None, "cotizacion_id": 7}
        self.cotizaciones = [{"id": 7, "created_at": "2026-10-09T15:00:00Z", "origen": "formulario", "nombre": "Ana Pérez",
                              "negocio": "Panadería Ana", "rubro": "Restaurante o comida", "servicio": "Tienda online",
                              "telefono": "+56 9 1111 2222", "email": "ana@ejemplo.cl", "mensaje": "Quiero vender tortas",
                              "estado": "nueva", "notas": None}]

    def responder(self, route):
        req = route.request
        u = urlparse(req.url)
        path, q = u.path, parse_qs(u.query)
        body = req.post_data or ""
        self.llamadas.append((req.method, path, body))
        js = lambda data, status=200: route.fulfill(status=status, content_type="application/json", body=json.dumps(data),
                                                    headers={"Access-Control-Allow-Origin": "*"})
        uno = "vnd.pgrst.object" in (req.headers.get("accept") or "")
        if req.method == "OPTIONS":
            return route.fulfill(status=200, headers={"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*"})
        if path == "/rest/v1/rpc/soy_admin":
            return js(self.admin)
        if path == "/rest/v1/proyectos":
            p = {**self.proyecto, "briefs": {"enviado_at": self.brief["enviado_at"], "actualizado_at": self.brief["actualizado_at"]}} if self.admin else self.proyecto
            return js(p if uno else [p])
        if path == "/rest/v1/historial":
            return js([{"estado": "brief", "created_at": "2026-10-10T12:00:00Z"}])
        if path == "/rest/v1/briefs":
            if req.method == "PATCH":
                cambio = json.loads(body)
                self.brief.update(cambio)
                return route.fulfill(status=204, headers={"Access-Control-Allow-Origin": "*"})
            return js(self.brief if uno else [self.brief])
        if path == "/rest/v1/cotizaciones":
            if req.method == "PATCH":
                self.cotizaciones[0].update(json.loads(body))
                return route.fulfill(status=204, headers={"Access-Control-Allow-Origin": "*"})
            if req.method == "POST":
                return route.fulfill(status=201, headers={"Access-Control-Allow-Origin": "*"})
            return js(self.cotizaciones)
        if path == "/rest/v1/estimados":
            if req.method == "POST":
                return route.fulfill(status=201, headers={"Access-Control-Allow-Origin": "*"})
            return js([{"id": 1, "created_at": "2026-10-14T10:00:00Z", "servicio": "pagina", "rubro": "barberia",
                        "rango_min": 210000, "rango_max": 350000, "detalle": {"incluye": ["Página con lo esencial"]}}])
        if path == "/storage/v1/object/list/archivos":
            return js([{"id": "f1", "name": n, "created_at": "2026-10-14T12:00:00Z", "metadata": {"size": 2048, "mimetype": "application/pdf"}} for n in self.archivos])
        if path.startswith("/storage/v1/object/sign/archivos"):
            paths = json.loads(body).get("paths", [])
            return js([{"path": x, "signedURL": f"/object/sign/archivos/{x}?token=t", "error": None} for x in paths])
        if path.startswith("/storage/v1/object/archivos/") and req.method == "POST":
            self.archivos.append(path.rsplit("/", 1)[1])
            return js({"Key": path, "Id": "x"})
        if path == "/functions/v1/found":
            accion = json.loads(body).get("accion")
            if accion == "brief-enviado":
                self.brief["enviado_at"] = "2026-10-14T13:00:00Z"
                self.proyecto["estado"] = "diseno"
            if accion == "invitar":
                return js({"proyecto_id": PID})
            if accion == "visitas":
                return js({"configurado": True, "total": 321, "eventos": 45,
                           "origenes": [{"nombre": "instagram", "visitas": 120}, {"nombre": "(directo)", "visitas": 80}],
                           "paginas": [{"ruta": "/", "visitas": 200, "evento": False}, {"ruta": "evento/whatsapp_click/barra", "visitas": 30, "evento": True}]})
            return js({"ok": True})
        return js({"message": "ruta no simulada: " + path}, 404)

    def hubo(self, metodo, ruta, contiene=""):
        return [b for m, p, b in self.llamadas if m == metodo and p.startswith(ruta) and contiene in b]


def pagina(browser, falso, email=None, viewport=(1440, 900)):
    ctx = browser.new_context(viewport={"width": viewport[0], "height": viewport[1]}, reduced_motion="reduce")
    if email:
        ctx.add_init_script(f"localStorage.setItem('sb-qwmxzaeyhqdwndijquab-auth-token', {json.dumps(sesion_falsa(email))})")
    ctx.route("**/assets/js/site.js*", con_clave)
    ctx.route(SB + "/**", falso.responder)
    page = ctx.new_page()
    errores = []
    page.on("console", lambda m: errores.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errores.append(str(e)))
    page.on("dialog", lambda d: d.accept())
    return ctx, page, errores


with sync_playwright() as p:
    browser = p.chromium.launch()

    # 0. sin clave configurada: el portal y el panel avisan que no están activos y nada llama a Supabase
    page = browser.new_page()
    page.route("**/assets/js/site.js*", sin_clave)
    llamadas = []
    page.on("request", lambda r: llamadas.append(r.url) if "supabase.co" in r.url else None)
    page.goto(BASE + "/mi-proyecto/", wait_until="load")
    page.wait_for_selector("#p-off:not([hidden])", timeout=8000)
    check("sin configurar: el portal avisa que no está activo", page.is_visible("#p-off"))
    page.goto(BASE + "/panel/", wait_until="load")
    page.wait_for_selector("#a-off:not([hidden])", timeout=8000)
    check("sin configurar: el panel lo indica", page.is_visible("#a-off"))
    page.goto(BASE + "/contacto/", wait_until="networkidle")
    check("sin configurar: nadie llama a Supabase", not llamadas, ", ".join(llamadas)[:200])
    page.close()

    # 1. entrada: pide el enlace al correo, sin crear cuentas nuevas
    falso = FalsoSupabase()
    ctx, page, errores = pagina(browser, falso)
    ctx.route(SB + "/auth/v1/otp*", lambda r: (falso.llamadas.append(("POST", "/auth/v1/otp", r.request.post_data)), r.fulfill(status=200, content_type="application/json", body="{}", headers={"Access-Control-Allow-Origin": "*"})))
    page.goto(BASE + "/mi-proyecto/", wait_until="load")
    page.wait_for_selector("#p-entrada:not([hidden])", timeout=8000)
    check("entrada: se muestra el formulario", page.is_visible("#p-entrada"))
    page.fill("#p-email", "ana@ejemplo")
    page.click("#p-entrada button")
    check("entrada: valida el correo", page.get_attribute("#p-entrada .status", "data-kind") == "error")
    page.fill("#p-email", "Ana@Ejemplo.cl")
    page.click("#p-entrada button")
    page.wait_for_selector("#p-entrada .status[data-kind='ok']", timeout=4000)
    otp = falso.hubo("POST", "/auth/v1/otp")
    check("entrada: pide el enlace sin crear cuenta", otp and '"create_user":false' in otp[0] and "ana@ejemplo.cl" in otp[0], otp[:1])
    check("entrada: sin errores", not errores, "; ".join(errores)[:200])
    ctx.close()

    # 2. cliente con sesión: etapas, brief que se guarda solo, archivos y envío
    falso = FalsoSupabase()
    ctx, page, errores = pagina(browser, falso, "ana@ejemplo.cl", (390, 844))
    page.goto(BASE + "/mi-proyecto/", wait_until="load")
    page.wait_for_selector("#pb-form .bsec", timeout=5000)
    check("portal: muestra el negocio", page.inner_text("#p-titulo") == "Panadería Ana")
    check("portal: etapa actual = Brief", "Brief" in page.inner_text(".etapas .actual"))
    check("portal: el brief trae las preguntas de /brief/", page.locator("#pb-form .bsec").count() >= 12)
    check("portal: carga lo ya respondido", page.input_value("#pb-form #b-negocio") == "Panadería Ana")
    check("portal: muestra la sección de tienda", page.is_visible("#pb-form #s-tienda") and page.is_hidden("#pb-form #s-sistema"))
    page.fill("#pb-form #b-hace", "Tortas y pan amasado")
    page.fill("#pb-form #b-horario", "Lun a sáb 8:00 a 20:00")
    page.check("#pb-form input[value='Comprar en línea']", force=True)
    page.wait_for_function("() => document.querySelector('#pb-estado').textContent.startsWith('Guardado')", timeout=6000)
    guardados = falso.hubo("PATCH", "/rest/v1/briefs")
    ult = json.loads(guardados[-1])["respuestas"] if guardados else {}
    check("portal: guarda solo mientras escribe", ult.get("Qué hace") == "Tortas y pan amasado" and ult.get("Acción buscada") == ["Comprar en línea"], ult)
    check("portal: avisa que guardó", "Guardado" in page.inner_text("#pb-estado"))
    page.set_input_files("#pa-input", files=[{"name": "logo final.pdf", "mimeType": "application/pdf", "buffer": b"%PDF-1.4 prueba"}])
    page.wait_for_selector("#pa-status[data-kind='ok']", timeout=4000)
    subida = [x for m, x, _ in falso.llamadas if m == "POST" and x.startswith("/storage/v1/object/archivos/")]
    check("archivos: se suben a la carpeta del proyecto", subida and subida[0].startswith(f"/storage/v1/object/archivos/{PID}/") and subida[0].endswith("-logo-final.pdf"), subida)
    check("archivos: aparecen en la lista", "logo-final.pdf" in page.inner_text("#pa-lista"))
    page.evaluate("""() => { const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array(26 * 1024 * 1024)], 'enorme.jpg', { type: 'image/jpeg' }));
        document.querySelector('.subir').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); }""")
    page.wait_for_selector("#pa-status[data-kind='error']", timeout=4000)
    check("archivos: rechaza más de 25 MB sin subirlo", "Muy pesados" in page.inner_text("#pa-status"))
    page.click("#pb-enviar")
    page.wait_for_function("() => document.querySelector('#pb-estado').textContent.includes('Enviado')", timeout=5000)
    check("envío: llama a la función del servidor", falso.hubo("POST", "/functions/v1/found", "brief-enviado"))
    check("envío: el brief queda cerrado", page.is_disabled("#pb-form #b-hace") and page.is_hidden("#pb-fin"))
    check("envío: la etapa pasa a Diseño", "Diseño" in page.inner_text(".etapas .actual"))
    over = page.evaluate("document.documentElement.scrollWidth - innerWidth")
    check("portal @390: sin scroll lateral", over <= 1, f"{over}px")
    check("portal: sin errores", not errores, "; ".join(errores)[:200])
    page.screenshot(path="tests/screens/portal-movil.png", full_page=True)
    ctx.close()

    # 3. panel: no admin
    falso = FalsoSupabase(admin=False)
    ctx, page, errores = pagina(browser, falso, "ana@ejemplo.cl")
    page.goto(BASE + "/panel/", wait_until="load")
    page.wait_for_selector("#a-noadmin:not([hidden])", timeout=8000)
    check("panel: un cliente no entra", page.is_visible("#a-noadmin") and page.is_hidden("#a-app"))
    ctx.close()

    # 4. panel: administrador
    falso = FalsoSupabase(admin=True)
    ctx, page, errores = pagina(browser, falso, "contacto@foundstudio.cl")
    page.goto(BASE + "/panel/", wait_until="load")
    page.wait_for_selector("#l-proyectos .item", timeout=5000)
    check("panel: lista los proyectos", "Panadería Ana" in page.inner_text("#l-proyectos"))
    page.click("#l-proyectos .item")
    page.wait_for_selector("#d-estado", timeout=5000)
    check("panel: muestra el brief del cliente", "Panadería Ana" in page.inner_text(".respuestas"))
    page.select_option("#d-estado", "revision")
    page.click("text=Guardar estado")
    page.wait_for_selector("#d-proyecto .status[data-kind='ok']", timeout=4000)
    est = falso.hubo("POST", "/functions/v1/found", '"estado"')
    check("panel: cambia el estado y avisa", est and '"revision"' in est[0] and '"avisar":true' in est[0], est[:1])
    page.click("#t-cotizaciones")
    check("panel: lista cotizaciones nuevas", "Quiero vender tortas" in page.inner_text("#l-cotizaciones"))
    page.click("#l-cotizaciones >> text=Aceptada")
    page.click("text=Crear proyecto y enviar acceso")
    page.wait_for_selector("#t-proyectos[aria-selected='true']", timeout=5000)
    inv = falso.hubo("POST", "/functions/v1/found", "invitar")
    check("panel: «Aceptada» crea el proyecto e invita al cliente",
          inv and '"email":"ana@ejemplo.cl"' in inv[0] and '"servicio":"tienda"' in inv[0] and '"cotizacion_id":7' in inv[0], inv[:1])
    page.click("#t-cotizaciones")
    page.click("#c-nueva")
    page.fill("#c-nombre", "Pedro")
    page.fill("#c-negocio", "Taller Pedro")
    page.click("#c-form button[type=submit]")
    page.wait_for_timeout(500)
    nueva = falso.hubo("POST", "/rest/v1/cotizaciones", "Taller Pedro")
    check("panel: agrega una cotización de WhatsApp", nueva and '"origen":"whatsapp"' in nueva[0], nueva[:1])
    page.click("#t-estimados")
    page.wait_for_selector("#e-filas tr", timeout=4000)
    check("panel: muestra los estimados", "$210.000 a $350.000" in page.inner_text("#e-filas"))
    page.click("#t-visitas")
    page.wait_for_selector(".vi-grid", timeout=4000)
    check("panel: muestra visitas y origen", "instagram" in page.inner_text("#v-visitas") and "321" in page.inner_text("#v-visitas"))
    page.keyboard.press("ArrowLeft")
    check("panel: pestañas con flechas", page.get_attribute("#t-estimados", "aria-selected") == "true")
    check("panel: sin errores", not errores, "; ".join(errores)[:200])
    page.click("#t-proyectos")
    page.screenshot(path="tests/screens/panel.png", full_page=True)
    ctx.close()

    # 5. sitio público con Supabase configurado: guarda cotizaciones y estimados (solo agregar)
    falso = FalsoSupabase()
    ctx, page, errores = pagina(browser, falso)
    ctx.route("https://api.web3forms.com/**", lambda r: r.fulfill(status=200, content_type="application/json", body='{"success": true}'))
    page.goto(BASE + "/servicios/", wait_until="load")
    page.wait_for_selector(".chat-fab", timeout=8000)
    page.click(".chat-fab")
    panel = page.locator(".chat-panel")
    panel.get_by_role("button", name="Calcular un estimado").click()
    for label in ["Barbería o belleza", "Una página web", "Una página con lo esencial"]:
        panel.get_by_role("button", name=label, exact=True).click()
    panel.get_by_role("button", name="Listo").click()
    panel.get_by_role("button", name="Sí, ya tengo").click()
    panel.get_by_role("button", name="Sin apuro").click()
    panel.locator(".estimate").wait_for(timeout=5000)
    page.wait_for_timeout(300)
    est = falso.hubo("POST", "/rest/v1/estimados")
    check("asistente: guarda el estimado sin datos personales",
          est and json.loads(est[0]) .get("rango_min") == 210000 and json.loads(est[0]).get("rubro") == "barberia", est[:1])
    page.goto(BASE + "/contacto/", wait_until="load")
    page.fill("#f-nombre", "Camila Prueba")
    page.fill("#f-negocio", "Almacén de prueba")
    page.fill("#f-tel", "+56 9 1111 2222")
    page.check("#f-consent")
    page.click("#cotizar button[type=submit]")
    page.wait_for_selector("#f-status[data-kind='ok']", timeout=4000)
    page.wait_for_timeout(300)
    cot = falso.hubo("POST", "/rest/v1/cotizaciones")
    fila = json.loads(cot[0]) if cot else {}
    check("contacto: la cotización llega al panel", fila.get("negocio") == "Almacén de prueba" and "versión" in fila.get("consentimiento", ""), fila)
    check("contacto: no envía estado ni campos de admin", "estado" not in fila and "notas" not in fila)
    check("público: sin errores", not errores, "; ".join(errores)[:200])
    ctx.close()

    browser.close()

bad = [r for r in results if not r[1]]
print(f"\n{len(results) - len(bad)}/{len(results)} pruebas del portal OK")
sys.exit(1 if bad else 0)
