"""Pruebas del portal de clientes (/mi-proyecto/), del panel (/panel/) y de lo que el sitio guarda en Supabase.

Uso, desde la carpeta del repo (con el servidor local corriendo, igual que qa.py):
    python tests/portal_qa.py

Supabase NUNCA se llama de verdad: todas las llamadas a *.supabase.co se interceptan y se responden aquí,
con una sesión falsa guardada en el navegador. Los permisos reales de la base de datos se prueban aparte
(tests/rls.mjs, ver docs/PORTAL.md).
"""
import json
import os
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
        # formularios de /brief/: uno ya pasado a la cotización 7 y uno nuevo sin cotización
        self.formularios = [
            {"id": 2, "created_at": "2026-10-14T18:00:00Z", "nombre": "Luis Soto", "negocio": "Ferretería Luis", "telefono": "+56 9 3333 4444",
             "email": None, "proyecto": "software", "respuestas": {"Nombre": "Luis Soto", "Negocio": "Ferretería Luis", "Rubro": "Ferretería",
             "Qué hace": "Vende herramientas", "Sistema: controlar": ["Inventario", "Ventas y caja"], "Proyecto": "software"},
             "consentimiento": "Aceptó la política de privacidad (versión 2026-10-14)", "estado": "nuevo", "cotizacion_id": None},
            {"id": 1, "created_at": "2026-10-09T14:00:00Z", "nombre": "Ana Pérez", "negocio": "Panadería Ana", "telefono": "+56 9 1111 2222",
             "email": "ana@ejemplo.cl", "proyecto": "tienda", "respuestas": {"Nombre": "Ana Pérez", "Horario": "Lun a sáb 8:00 a 20:00", "Proyecto": "tienda"},
             "consentimiento": "Aceptó la política de privacidad (versión 2026-10-14)", "estado": "revisado", "cotizacion_id": 7}]

    def responder(self, route):
        req = route.request
        u = urlparse(req.url)
        path, q = u.path, parse_qs(u.query)
        body = req.post_data or ""
        self.llamadas.append((req.method, path, body if req.method != "DELETE" else u.query))
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
        if req.method == "DELETE" and path in ("/rest/v1/cotizaciones", "/rest/v1/estimados", "/rest/v1/proyectos"):
            ids = re.findall(r"[0-9a-f-]{36}|\d+", q.get("id", [""])[0])
            if path == "/rest/v1/cotizaciones":
                self.cotizaciones = [c for c in self.cotizaciones if str(c["id"]) not in ids]
            return js([{"id": int(i) if i.isdigit() else i} for i in ids])
        if path == "/auth/v1/user" and req.method == "PUT":
            return js(json.loads(sesion_falsa("contacto@foundstudio.cl"))["user"])
        if path == "/rest/v1/cotizaciones":
            if req.method == "PATCH":
                self.cotizaciones[0].update(json.loads(body))
                return route.fulfill(status=204, headers={"Access-Control-Allow-Origin": "*"})
            if req.method == "POST":
                if "return=representation" in (req.headers.get("prefer") or ""):
                    return js({"id": 8} if uno else [{"id": 8}], 201)
                return route.fulfill(status=201, headers={"Access-Control-Allow-Origin": "*"})
            return js(self.cotizaciones)
        if path == "/rest/v1/formularios":
            if req.method == "PATCH":
                fid = int(q.get("id", ["eq.0"])[0].split(".")[1])
                next(f for f in self.formularios if f["id"] == fid).update(json.loads(body))
                return route.fulfill(status=204, headers={"Access-Control-Allow-Origin": "*"})
            if req.method == "POST":
                return route.fulfill(status=201, headers={"Access-Control-Allow-Origin": "*"})
            return js(self.formularios)
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
            if accion == "enlace" and json.loads(body).get("enviar") is False:
                return js({"link": "https://qwmxzaeyhqdwndijquab.supabase.co/auth/v1/verify?token=abc&type=magiclink"})
            if accion == "clave":
                return js({"clave": "k7mpa-x3qre", "email": self.proyecto["cliente_email"]})
            if accion == "cambiar-correo":
                self.proyecto["cliente_email"] = json.loads(body)["email"]
                return js({"ok": True, "email": self.proyecto["cliente_email"]})
            if accion == "eliminar-proyecto":
                return js({"ok": True, "archivos": 0, "cuenta": False})
            if accion == "visitas":
                return js({"configurado": True, "total": 321, "eventos": 45,
                           "origenes": [{"nombre": "l.instagram.com", "visitas": 120}, {"nombre": "(directo)", "visitas": 80}, {"nombre": "Google", "visitas": 40}],
                           "paginas": [{"ruta": "/", "visitas": 200, "evento": False}, {"ruta": "/contacto", "visitas": 30, "evento": False},
                                       {"ruta": "/contacto/", "visitas": 6, "evento": False}, {"ruta": "evento/asistente_inicio", "visitas": 25, "evento": True},
                                       {"ruta": "evento/asistente_estimado/pagina/barberia/350k-650k", "visitas": 9, "evento": True},
                                       {"ruta": "evento/whatsapp_click/barra", "visitas": 7, "evento": True},
                                       {"ruta": "evento/whatsapp_click/asistente/pagina", "visitas": 4, "evento": True}]})
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
    antes = len(errores)   # la contraseña mala responde 400 a propósito
    ctx.route(SB + "/auth/v1/token*", lambda r: (falso.llamadas.append(("POST", "/auth/v1/token", r.request.post_data)), r.fulfill(status=400, content_type="application/json", body='{"code":"invalid_credentials","message":"Invalid login credentials"}', headers={"Access-Control-Allow-Origin": "*"})))
    page.fill("#p-clave", "malaclave1")
    page.click("#p-entrada button[type=submit]")
    page.wait_for_selector("#p-entrada .status[data-kind='error']", timeout=4000)
    clave = falso.hubo("POST", "/auth/v1/token")
    check("entrada: con contraseña entra sin mandar correo", clave and "malaclave1" in clave[0] and len(falso.hubo("POST", "/auth/v1/otp")) == 1, clave[:1])
    check("entrada: contraseña mala se explica", "incorrectos" in page.inner_text("#p-entrada .status"))
    check("entrada: sin errores", not errores[:antes] and all("400" in e for e in errores[antes:]), "; ".join(errores)[:200])
    ctx.close()

    # 2. cliente con sesión: etapas, brief que se guarda solo, archivos y envío
    falso = FalsoSupabase()
    ctx, page, errores = pagina(browser, falso, "ana@ejemplo.cl", (390, 844))
    page.goto(BASE + "/mi-proyecto/", wait_until="load")
    page.wait_for_selector("#pb-form .bsec", timeout=5000)
    check("portal: muestra el negocio", page.inner_text("#p-titulo") == "Panadería Ana")
    page.click("#p-vista")
    check("portal: «Perfil» muestra el perfil y oculta el proyecto", page.is_visible("#p-perfil .temas") and page.is_hidden("#p-app") and page.inner_text("#p-titulo") == "Tu perfil")
    page.click("#p-vista")
    check("portal: vuelve al proyecto", page.is_visible("#p-app") and page.is_hidden("#p-perfil") and page.inner_text("#p-titulo") == "Panadería Ana")
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
    page.click("#d-proyecto >> text=Enlace sin correo")
    page.wait_for_selector("#d-proyecto .acceso", timeout=4000)
    sin_correo = falso.hubo("POST", "/functions/v1/found", '"enlace"')
    wa_href = page.get_attribute("#d-proyecto .acceso a", "href") or ""
    check("panel: enlace de acceso sin gastar correo", sin_correo and '"enviar":false' in sin_correo[0] and "verify%3Ftoken%3Dabc" in wa_href, sin_correo[:1])
    page.click("#d-proyecto >> text=Contraseña temporal")
    page.click("#a-confirmar [value=si]")
    page.wait_for_function("() => document.querySelector('#d-proyecto .acceso input')?.value === 'k7mpa-x3qre'", timeout=4000)
    check("panel: contraseña temporal para WhatsApp", "k7mpa-x3qre" in (page.get_attribute("#d-proyecto .acceso a", "href") or "").replace("%2D", "-"))
    page.click("#d-proyecto >> text=Escribir al cliente por correo")
    page.fill("#d-proyecto textarea[name=texto]", "Nos falta tu logo.")
    page.click("#d-proyecto >> text=Enviar correo")
    page.wait_for_timeout(400)
    msg = falso.hubo("POST", "/functions/v1/found", '"mensaje"')
    check("panel: escribe al cliente por correo", msg and "Nos falta tu logo." in msg[0], msg[:1])
    page.click("#d-proyecto >> text=Datos del cliente")
    page.fill("#d-proyecto input[name=cliente_email]", "ana.nueva@ejemplo.cl")
    page.click("#d-proyecto >> text=Guardar datos")
    page.wait_for_timeout(500)
    cc = falso.hubo("POST", "/functions/v1/found", "cambiar-correo")
    check("panel: cambia el correo de acceso", cc and "ana.nueva@ejemplo.cl" in cc[0], cc[:1])
    page.click("#t-cotizaciones")
    check("panel: lista cotizaciones nuevas", "Quiero vender tortas" in page.inner_text("#l-cotizaciones"))
    page.click("#l-cotizaciones >> text=Aceptada")
    page.click("text=Crear proyecto y enviar acceso")
    page.wait_for_selector("#t-proyectos[aria-selected='true']", timeout=5000)
    inv = falso.hubo("POST", "/functions/v1/found", "invitar")
    check("panel: «Aceptada» crea el proyecto e invita al cliente",
          inv and '"email":"ana@ejemplo.cl"' in inv[0] and '"enviar":true' in inv[0] and '"servicio":"tienda"' in inv[0] and '"cotizacion_id":7' in inv[0], inv[:1])
    pre = falso.hubo("PATCH", "/rest/v1/briefs", "Lun a sáb 8:00 a 20:00")
    check("panel: al aceptar, el formulario llena el brief del proyecto", pre and '"Correo":"ana@ejemplo.cl"' in pre[0], falso.hubo("PATCH", "/rest/v1/briefs")[:1])
    # formularios de «Lo que te solicitamos»
    check("panel: cuenta los formularios nuevos", page.inner_text("#n-formularios").strip() == "1")
    page.click("#t-formularios")
    check("panel: muestra las respuestas del formulario",
          "Ferretería Luis" in page.inner_text("#l-formularios") and "Inventario, Ventas y caja" in page.inner_text("#l-formularios .respuestas")
          and "Sistema" in page.inner_text("#l-formularios"))
    page.click("#l-formularios >> text=Crear cotización")
    page.wait_for_selector("#t-cotizaciones[aria-selected='true']", timeout=5000)
    cf = falso.hubo("POST", "/rest/v1/cotizaciones", "Ferretería Luis")
    ff = falso.hubo("PATCH", "/rest/v1/formularios", '"cotizacion_id":8')
    check("panel: el formulario pasa a cotización", cf and '"origen":"formulario"' in cf[0] and '"rubro":"Ferretería"' in cf[0] and ff and '"revisado"' in ff[0], (cf[:1], ff[:1]))
    page.click("#t-formularios")
    page.click("#f-form >> text=Todos")
    page.click("#l-formularios li:first-child >> text=Archivar")
    page.wait_for_timeout(300)
    check("panel: archiva un formulario", falso.hubo("PATCH", "/rest/v1/formularios", '"archivado"'))
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
    vi = page.inner_text("#v-visitas")
    check("panel: visitas en lenguaje claro", all(t in vi for t in ("Instagram", "276", "Inicio", "Contacto", "Abrieron WhatsApp", "barra superior (7)", "Te contactaron")), vi[:300])
    check("panel: junta /contacto y /contacto/", "36" in page.inner_text(".vi-grid"))
    check("panel: barras con ancho", page.eval_on_selector(".vi-barra i", "e => getComputedStyle(e).width") not in ("0px", "auto"))
    if os.environ.get("QA_CAPTURAS"):
        page.set_viewport_size({"width": 1280, "height": 900})
        page.screenshot(path=os.path.join(os.environ["QA_CAPTURAS"], "panel-visitas.png"), full_page=True)
        page.set_viewport_size({"width": 390, "height": 844})
        page.screenshot(path=os.path.join(os.environ["QA_CAPTURAS"], "panel-visitas-movil.png"), full_page=True)
    page.keyboard.press("ArrowLeft")
    check("panel: pestañas con flechas", page.get_attribute("#t-estimados", "aria-selected") == "true")
    page.click("#t-cotizaciones")
    page.click("#f-cot >> text=Todas")
    page.fill("#c-buscar", "no-existe-xyz")
    check("panel: busca cotizaciones", page.locator("#l-cotizaciones .cot").count() == 0)
    page.fill("#c-buscar", "")
    page.locator("#l-cotizaciones .cot").first.get_by_role("button", name="Editar").click()
    page.fill("#ed7x", "Propuesta de $300.000")
    page.click("text=Guardar cambios")
    page.wait_for_timeout(400)
    notas = falso.hubo("PATCH", "/rest/v1/cotizaciones", "300.000")
    check("panel: guarda notas internas", notas and "Propuesta de $300.000" in page.inner_text("#l-cotizaciones"), notas[:1])
    page.locator("#l-cotizaciones .cot").first.get_by_role("button", name="Eliminar", exact=True).click()
    page.wait_for_selector("#a-confirmar[open]", timeout=3000)
    page.click("#a-confirmar [value=no]")
    check("panel: cancelar no elimina", not falso.hubo("DELETE", "/rest/v1/cotizaciones"))
    page.check("#c-todas")
    page.click("#c-g-eliminar")
    page.click("#a-confirmar [value=si]")
    page.wait_for_function("() => /eliminad/.test(document.querySelector('#a-aviso').textContent)", timeout=3000)
    borr = falso.hubo("DELETE", "/rest/v1/cotizaciones")
    check("panel: elimina cotizaciones seleccionadas", borr and "7" in borr[0] and not page.locator("#l-cotizaciones .cot").count(), borr[:1])
    page.click("#t-estimados")
    page.click("#e-filas .btn-x")
    page.wait_for_timeout(400)
    check("panel: elimina un estimado", falso.hubo("DELETE", "/rest/v1/estimados"))
    page.click("#t-perfil")
    check("perfil: muestra el correo de la cuenta", page.input_value("#a-correo") == "contacto@foundstudio.cl")
    page.fill("#a-nombre", "Renato")
    page.click("#v-perfil >> text=Guardar nombre")
    page.wait_for_timeout(400)
    check("perfil: guarda el nombre en la cuenta", falso.hubo("PUT", "/auth/v1/user", '"nombre":"Renato"'))
    page.click(".tema-op:has(input[value=claro])")
    page.wait_for_timeout(400)
    check("perfil: tema claro se aplica y se guarda", page.get_attribute("html", "data-tema") == "claro"
          and "found-horizontal-dark.svg" in page.get_attribute(".wordmark img", "src")
          and falso.hubo("PUT", "/auth/v1/user", '"tema":"claro"'))
    page.screenshot(path="tests/screens/panel-perfil-claro.png", full_page=True)
    page.reload(wait_until="load")
    check("perfil: el tema se recuerda al volver", page.get_attribute("html", "data-tema") == "claro")
    page.wait_for_selector("#a-app:not([hidden])", timeout=5000)
    page.click("#t-perfil")
    page.click(".tema-op:has(input[value=oscuro])")
    page.fill("#a-clave1", "clave-segura-1")
    page.fill("#a-clave2", "clave-segura-1")
    page.click("#a-clave-form button")
    page.wait_for_selector("#a-clave-form .status[data-kind='ok']", timeout=4000)
    check("panel: crea la contraseña", falso.hubo("PUT", "/auth/v1/user", "clave-segura-1"))
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
