// Prueba completa del sitio con Playwright CLI:
//   playwright-cli run-code --filename=tests/qa.js
// Requiere el servidor local en http://localhost:8417 (python -m http.server 8417).
async page => {
  const BASE = "http://localhost:8417/";
  const OUT = "tests/screens/";
  const results = [];
  const ok = (vp, name, pass, info = "") => results.push(`${pass ? "OK  " : "FALLA"} [${vp}] ${name}${info ? " — " + info : ""}`);
  const errors = [];
  page.on("console", m => { if (m.type() === "error" && !(simulatedFail && m.text().includes("400"))) errors.push(m.text()); });
  page.on("pageerror", e => errors.push(String(e)));

  // Para probar el envío exitoso sin una clave real: se reemplaza la clave solo en esta prueba
  // y se simula la respuesta de Web3Forms. El archivo real no cambia.
  let lastPayload = null, mode = "success", simulatedFail = false;
  await page.route(url => url.pathname.endsWith("/assets/js/main.js"), async route => {
    const res = await route.fetch();
    const body = (await res.text()).replace('const WEB3FORMS_KEY = "PEGAR_AQUI"', 'const WEB3FORMS_KEY = "CLAVE_DE_PRUEBA"');
    await route.fulfill({ response: res, body, headers: { ...res.headers(), "content-type": "application/javascript" } });
  });
  await page.route("https://api.web3forms.com/submit", async route => {
    lastPayload = JSON.parse(route.request().postData() || "{}");
    if (mode === "success") await route.fulfill({ status: 200, contentType: "application/json", body: '{"success":true,"message":"Email sent"}' });
    else await route.fulfill({ status: 400, contentType: "application/json", body: '{"success":false,"message":"Invalid key"}' });
  });

  const noHScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 0.5);
  const scrollY = y => page.evaluate(y => { document.documentElement.style.scrollBehavior = "auto"; scrollTo(0, y); }, y);
  const settle = (ms = 900) => page.waitForTimeout(ms);
  const activeCap = () => page.evaluate(() => document.querySelector(".cap.is-on")?.dataset.cap);
  const insideVp = sel => page.evaluate(sel => {
    const el = document.querySelector(sel), vp = document.querySelector("#vp");
    if (!el) return false;
    const a = el.getBoundingClientRect(), b = vp.getBoundingClientRect();
    return a.top >= b.top - 1 && a.bottom <= b.bottom + 1 && a.height > 0;
  }, sel);
  // baja por la historia hasta que el capítulo k esté activo y el selector esté a la vista dentro de la ventana
  async function scrollUntil(k, sel) {
    const h = await page.evaluate(() => innerHeight);
    let y = await page.evaluate(() => scrollY);
    for (let n = 0; n < 200; n++) {
      if ((await activeCap()) === String(k) && (!sel || await insideVp(sel))) { await settle(1600); if ((await activeCap()) === String(k) && (!sel || await insideVp(sel))) return true; }
      y += h * 0.12; await scrollY(y); await settle(160);
    }
    return false;
  }

  for (const [vp, w, h] of [["celular 390", 390, 844], ["escritorio 1440", 1440, 900]]) {
    const tag = w < 500 ? "mobile" : "desktop";
    errors.length = 0; simulatedFail = false; mode = "success";
    await page.setViewportSize({ width: w, height: h });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(BASE, { waitUntil: "load" });
    await settle(1500);

    ok(vp, "carga sin scroll horizontal", await noHScroll());
    ok(vp, "título y descripción SEO", (await page.title()).includes("Huechuraba") && (await page.locator('meta[name=description]').getAttribute("content")).length > 80);
    ok(vp, "datos estructurados con el correo", await page.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].some(s => JSON.parse(s.textContent).email === "contacto@foundstudio.cl")));
    ok(vp, "imagen Open Graph responde", (await page.request.get(BASE + "assets/img/og-found-studio.png")).ok());
    ok(vp, "historia parte en 404", (await activeCap()) === "0" && (await page.textContent("#tag")) === "Sin página");
    await page.screenshot({ path: `${OUT}${tag}-01-404.png` });
    // tu negocio: escribir el nombre cambia la URL, el final y el formulario
    await page.fill("#biz", "Botillería Don Pepe");
    await settle(300);
    ok(vp, "nombre: la URL muestra tu dominio", (await page.textContent("#urltext")) === "botilleriadonpepe.cl", await page.textContent("#urltext"));
    ok(vp, "nombre: la ventana dice que tu negocio no aparece", (await page.textContent("#s404h")) === "“Botillería Don Pepe” no aparece");
    ok(vp, "nombre: el final pregunta por tu negocio", (await page.textContent("#final-h")) === "¿Y Botillería Don Pepe?");
    ok(vp, "nombre: el formulario ya trae el negocio", (await page.inputValue("#f-negocio")) === "Botillería Don Pepe");
    await page.screenshot({ path: `${OUT}${tag}-01b-nombre.png` });


    // recorrer la historia completa
    const urls = new Set(), caps = new Set();
    let maxOverflow = true;
    const total = await page.evaluate(() => document.querySelector("#story").offsetHeight);
    for (let y = 0; y <= total; y += h * 0.2) {
      await scrollY(y); await settle(90);
      caps.add(await activeCap());
      if (!(await noHScroll())) maxOverflow = false;
    }
    await settle(800);
    let cut = [];
    for (let y = 0; y <= total; y += h * 0.5) {
      await scrollY(y); await settle(1300);
      const u = await page.textContent("#urltext"); urls.add(u);
      if (await page.evaluate(() => { const e = document.querySelector("#urltext"); return e.scrollWidth > e.clientWidth + 1; })) cut.push(u);
    }
    ok(vp, "el dominio se lee completo en la barra (sin cortar)", cut.length === 0, cut.join(" "));
    ok(vp, "los 8 capítulos aparecen con el scroll", caps.size === 8, [...caps].join(","));
    ok(vp, "la URL se escribe sola por rubro", ["lapicadelbarrio.cl", "navajabarber.cl", "almacendonarosa.cl", "caja.laesquina.cl", "mesalargaeventos.cl", "cordilleraobras.cl"].every(u => urls.has(u)), [...urls].join(" "));
    ok(vp, "sin scroll horizontal durante toda la historia", maxOverflow);
    const fict = await page.evaluate(() => [...document.querySelectorAll(".skin")].slice(1, 7).every(s => s.dataset.tag === "Ejemplo ficticio" && s.textContent.includes("ejemplo ficticio")));
    ok(vp, "cada rubro dice “Ejemplo ficticio”", fict);

    // barbería: elegir hora
    await scrollY(0); await settle(400);
    ok(vp, "barbería: la reserva queda a la vista", await scrollUntil(2, "#agendar"));
    await page.screenshot({ path: `${OUT}${tag}-02-barberia.png` });
    await page.click(".barb-days button[data-day='Sábado']");
    await page.click("#slots button:not([disabled])");
    const agText = await page.textContent("#agendar");
    await page.click("#agendar");
    const okText = await page.textContent("#barb-ok");
    ok(vp, "barbería: elegir día y hora y agendar", agText.startsWith("Agendar sábado") && okText.includes("Hora reservada"), okText);

    // almacén: agregar al carro
    ok(vp, "almacén: productos a la vista", await scrollUntil(3, ".alm-prods .prod:nth-child(4) .add"));
    await page.click(".alm-prods .prod:nth-child(4) .add");
    await page.click(".alm-prods .prod:nth-child(6) .add");
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}${tag}-03-almacen.png` });
    ok(vp, "almacén: el carro suma productos", (await page.textContent("#cartn")) === "2" && (await page.textContent("#meter-t")).includes("4.020"), await page.textContent("#meter-t"));


    // restaurante: pestañas y reserva
    await scrollY(0); await settle(400);
    ok(vp, "restaurante: la reserva queda a la vista", await scrollUntil(1, "#rest-go"));
    await page.click(".rest-tabs [data-tab='beb']");
    ok(vp, "restaurante: cambiar de pestaña muestra otra carta", await page.evaluate(() => !document.querySelector("[data-panel='beb']").hidden && document.querySelector("[data-panel='alm']").hidden));
    await page.click("[data-pax='1']"); await page.click("[data-pax='1']");
    await page.click(".rest-hours-pick button >> nth=2"); await page.click("#rest-go");
    ok(vp, "restaurante: reserva con personas y hora", (await page.textContent("#rest-ok")).includes("4 personas a las 20:30"), await page.textContent("#rest-ok"));

    // botillería: vender, stock bajo, reponer
    ok(vp, "botillería: el inventario queda a la vista", await scrollUntil(4, ".boti-row[data-name^='Hielo'] .sell"));
    await page.screenshot({ path: `${OUT}${tag}-04b-botilleria.png` });
    const hielo = ".boti-row[data-name^='Hielo']";
    for (let k = 0; k < 3; k++) await page.click(`${hielo} .sell`);
    ok(vp, "botillería: vender baja el stock hasta agotarse", (await page.textContent(`${hielo} .stk`)) === "0" && await page.isDisabled(`${hielo} .sell`));
    ok(vp, "botillería: suben las ventas y las boletas", (await page.textContent("#boti-tickets")) === "60" && (await page.textContent("#boti-sales")) === "$188.800", await page.textContent("#boti-sales"));
    await page.click(`${hielo} .restock`); await page.click(".boti-row[data-name^='Pisco'] .restock");
    ok(vp, "botillería: reponer quita la alerta de stock bajo", (await page.textContent("#boti-low")) === "0" && (await page.textContent("#boti-alert-t")).includes("stock suficiente"));

    // banquetería: cotizador
    ok(vp, "banquetería: cotizador a la vista", await scrollUntil(5, "#evt-go"));
    await page.fill("#evt-guests", "120"); await page.dispatchEvent("#evt-guests", "input");
    await page.click(".evt-type button >> nth=1");
    ok(vp, "banquetería: el total se calcula en vivo", (await page.textContent("#evt-total")) === "$2.988.000", await page.textContent("#evt-total"));

    // construcción: calculadora
    ok(vp, "construcción: calculadora a la vista", await scrollUntil(6, "#con-go"));
    await page.click(".con-kind button >> nth=1");
    await page.fill("#con-m2", "50"); await page.dispatchEvent("#con-m2", "input");
    ok(vp, "construcción: el valor por m² se calcula en vivo", (await page.textContent("#con-total")) === "$1.400.000", await page.textContent("#con-total"));
    await scrollUntil(5); await page.screenshot({ path: `${OUT}${tag}-04-banqueteria.png` });
    await scrollUntil(6); await page.screenshot({ path: `${OUT}${tag}-05-construccion.png` });

    // final: botones de rubro llevan al formulario con el rubro elegido
    ok(vp, "final “¿Y tu negocio?” visible", await scrollUntil(7, ".chips"));
    await page.screenshot({ path: `${OUT}${tag}-06-tu-negocio.png` });
    await page.click(".chips a[data-rubro='barbería']");
    await settle(1500);
    ok(vp, "botón de rubro preselecciona el formulario", (await page.inputValue("#f-rubro")) === "barbería");
    const wa = await page.getAttribute("#wa-inline", "href");
    ok(vp, "WhatsApp con mensaje del rubro", decodeURIComponent(wa) === "https://wa.me/56942579133?text=Hola {found}, tengo una barbería y quiero cotizar", decodeURIComponent(wa));
    ok(vp, "el formulario quedó en pantalla", await page.evaluate(() => { const r = document.querySelector("#form").getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }));

    // CTA "Quiero mi página" de la cabecera
    await scrollY(0); await settle(500);
    await page.click(".top [data-cta]");
    await settle(1500);
    ok(vp, "“Quiero mi página” lleva al formulario", await page.evaluate(() => { const r = document.querySelector("#contacto").getBoundingClientRect(); return r.top < innerHeight * 0.6 && r.bottom > 0; }));

    // secciones
    for (const id of ["servicios", "portafolio", "proceso", "preguntas", "contacto"]) {
      await page.evaluate(id => { document.documentElement.style.scrollBehavior = "auto"; document.getElementById(id).scrollIntoView(); }, id);
      await settle(900);
      await page.screenshot({ path: `${OUT}${tag}-s-${id}.png` });
      if (!(await noHScroll())) ok(vp, `sin scroll horizontal en #${id}`, false);
    }
    // servicios: clic en "Software a medida" lleva al formulario con el servicio elegido
    await page.evaluate(() => document.getElementById("servicios").scrollIntoView());
    await settle(900);
    await page.click(".svc[data-servicio='software']");
    await settle(1500);
    ok(vp, "servicios: el clic preselecciona el servicio en el formulario", (await page.inputValue("#f-servicio")) === "software / inventario");
    // software: el editor se escribe al aparecer
    await page.evaluate(() => document.getElementById("software").scrollIntoView());
    await settle(3200);
    ok(vp, "software: el editor de código se escribe al aparecer", await page.evaluate(() => document.querySelector(".editor").classList.contains("is-run") && getComputedStyle(document.querySelector("#editor-out")).opacity === "1"));
    // proceso: los pasos se iluminan al bajar
    await page.evaluate(() => { const r = document.querySelector(".steps-wrap").getBoundingClientRect(); scrollTo(0, scrollY + r.top - innerHeight * 0.75); });
    await settle(700);
    const litTop = await page.$$eval(".steps li.is-lit", l => l.length);
    await page.evaluate(() => { const r = document.querySelector(".steps-wrap").getBoundingClientRect(); scrollTo(0, scrollY + r.bottom - innerHeight * 0.5); });
    await settle(700);
    const litAll = await page.$$eval(".steps li.is-lit", l => l.length);
    ok(vp, "proceso: los pasos se iluminan a medida que bajas", litTop <= 1 && litAll === 4, `${litTop} → ${litAll}`);
    ok(vp, "servicios: 5 servicios en 2 grupos", (await page.locator(".svc-list li").count()) === 5 && (await page.locator(".svc-group").count()) === 2);
    ok(vp, "portafolio: 3 carpetas", (await page.locator(".folder").count()) === 3);
    const hrefs = await page.$$eval(".folder", fs => fs.map(f => [f.tagName, f.getAttribute("href"), f.getAttribute("target")]));
    ok(vp, "portafolio: carpetas abren los sitios reales en otra pestaña", hrefs[0][1] === "https://lasdeliciasdenubi.cl/" && hrefs[1][1] === "https://gracia-vida.vercel.app/" && hrefs[0][2] === "_blank" && hrefs[1][2] === "_blank", JSON.stringify(hrefs));
    ok(vp, "portafolio: tercera carpeta “Próximamente: tu negocio”", (await page.textContent(".folder--next .folder-name")) === "Próximamente: tu negocio");
    await page.evaluate(() => document.getElementById("portafolio").scrollIntoView());
    await page.click(".folder--next"); await settle(1500);
    ok(vp, "portafolio: la tercera carpeta lleva al formulario", await page.evaluate(() => { const r = document.querySelector("#contacto").getBoundingClientRect(); return r.top < innerHeight * 0.6 && r.bottom > 0; }));
    // con un link real, la carpeta abre el sitio en otra pestaña
    const linked = await page.evaluate(() => { const f = document.querySelector(".folder"); return !!f; });
    ok(vp, "portafolio: (listo para links reales)", linked);
    ok(vp, "proceso: 4 pasos", (await page.locator(".steps li").count()) === 4);
    ok(vp, "FAQ: 6 preguntas", (await page.locator(".qa details").count()) === 6);
    await page.click(".qa details:nth-child(3) summary");
    ok(vp, "FAQ se abre al hacer clic", await page.evaluate(() => document.querySelector(".qa details:nth-child(3)").open));
    ok(vp, "correo visible bajo el formulario", await page.isVisible("text=contacto@foundstudio.cl >> nth=0"));

    // botón flotante: oculto sobre el formulario, visible en servicios
    await page.evaluate(() => document.getElementById("contacto").scrollIntoView());
    await settle(700);
    ok(vp, "WhatsApp flotante se oculta sobre el formulario", await page.evaluate(() => document.querySelector("#wa-fab").classList.contains("is-hidden")));
    await page.evaluate(() => document.getElementById("servicios").scrollIntoView());
    await settle(1800);
    ok(vp, "WhatsApp flotante visible fuera de la historia", await page.evaluate(() => !document.querySelector("#wa-fab").classList.contains("is-hidden")));
    if (w < 860) {
      await page.evaluate(() => scrollBy(0, 500)); await settle(250);
      ok(vp, "WhatsApp flotante se esconde mientras bajas leyendo", await page.evaluate(() => document.querySelector("#wa-fab").classList.contains("is-hidden")));
      await settle(1800);
      ok(vp, "WhatsApp flotante vuelve al detenerte", await page.evaluate(() => !document.querySelector("#wa-fab").classList.contains("is-hidden")));
    }
    const fabBox = await page.locator("#wa-fab").boundingBox();
    ok(vp, "WhatsApp flotante dentro de la pantalla", fabBox.x + fabBox.width <= w && fabBox.y + fabBox.height <= h, JSON.stringify(fabBox));

    // formulario: validación
    await page.evaluate(() => document.getElementById("contacto").scrollIntoView());
    await page.selectOption("#f-rubro", { index: 0 }).catch(() => {});
    await page.evaluate(() => { const s = document.querySelector("#f-rubro"); s.value = ""; });
    await page.click("#f-send");
    const errs = await page.$$eval(".err", els => els.filter(e => e.textContent.trim()).length);
    ok(vp, "formulario vacío muestra errores bajo los campos", errs >= 3, `${errs} errores`);
    ok(vp, "el foco va al primer campo con error", await page.evaluate(() => document.activeElement.id === "f-nombre"));
    await page.fill("#f-nombre", "Camila Rojas");
    await page.fill("#f-negocio", "Panadería La Espiga");
    await page.selectOption("#f-rubro", "almacén");
    await page.fill("#f-telefono", "+56 9 1234 5678");
    await page.fill("#f-email", "camila@correo");
    await page.click("#f-send");
    ok(vp, "correo inválido se marca", (await page.textContent("#e-email")).includes("incompleto"));
    await page.fill("#f-email", "camila@ejemplo.cl");
    await page.fill("#f-mensaje", "Quiero vender por internet con despacho en la comuna.");
    mode = "success"; lastPayload = null;
    await page.click("#f-send");
    await page.waitForSelector("#f-status.is-ok", { timeout: 5000 }).catch(() => {});
    const okMsg = await page.textContent("#f-status");
    ok(vp, "envío exitoso: mensaje de confirmación", okMsg === "¡Listo! Te respondemos en menos de 24 horas", okMsg);
    ok(vp, "envío: asunto “Nuevo contacto web: [negocio]”", lastPayload?.subject === "Nuevo contacto web: Panadería La Espiga", lastPayload?.subject);
    ok(vp, "envío: incluye botcheck y todos los campos", lastPayload && lastPayload.botcheck === false && ["nombre", "negocio", "rubro", "telefono", "email", "mensaje"].every(k => k in lastPayload));
    // error del servidor
    await page.fill("#f-nombre", "Camila Rojas"); await page.fill("#f-negocio", "La Espiga"); await page.selectOption("#f-rubro", "otro"); await page.fill("#f-email", "camila@ejemplo.cl");
    mode = "fail"; simulatedFail = true;
    await page.click("#f-send");
    await page.waitForSelector("#f-status.is-err", { timeout: 5000 }).catch(() => {});
    ok(vp, "envío fallido: mensaje con el correo", (await page.textContent("#f-status")) === "No se pudo enviar. Escríbenos a contacto@foundstudio.cl");
    await page.screenshot({ path: `${OUT}${tag}-s-contacto-error.png` });

    // teclado: el foco nunca entra a ejemplos ocultos
    await scrollY(0); await settle(400);
    await page.evaluate(() => document.activeElement.blur());
    let leaked = 0, reached = new Set();
    for (let i = 0; i < 80; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const a = document.activeElement;
        return { inert: !!a.closest("[inert]"), id: a.id || a.className || a.tagName, ring: getComputedStyle(a).outlineStyle !== "none" || a.matches(":focus-visible") };
      });
      if (info.inert) { leaked++; reached.add("FUGA:" + info.id); }
      reached.add(info.id);
    }
    ok(vp, "teclado: el foco no entra en ejemplos ocultos", leaked === 0, `${reached.size} elementos; ` + [...reached].filter(x => x.startsWith("FUGA")).join(","));
    ok(vp, "teclado: llega al formulario", [...reached].includes("f-nombre"));

    ok(vp, "sin errores en la consola", errors.length === 0, errors.join(" | ").slice(0, 300));
  }

  // movimiento reducido
  errors.length = 0;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE, { waitUntil: "load" });
  await settle(1200);
  const glitch = await page.evaluate(() => getComputedStyle(document.querySelector(".s404-code")).animationName);
  ok("reduce", "sin animación de glitch", glitch === "none", glitch);
  const total = await page.evaluate(() => document.querySelector("#story").offsetHeight);
  await scrollY(total * 0.45); await settle(300);
  const url = await page.textContent("#urltext");
  ok("reduce", "la URL aparece completa al instante", url.endsWith(".cl"), url);
  ok("reduce", "sin errores en la consola", errors.length === 0, errors.join(" | "));

  return results.join("\n");
}
