/* {found} studio · foundstudio.cl
   Comportamiento compartido por todas las páginas. Sin dependencias.
   Configuración: estos valores son los únicos que hay que tocar. */
window.FOUND = {
  WHATSAPP: "56942579133",                 // número sin + ni espacios
  WEB3FORMS_KEY: "13ae56a6-e783-4914-9675-7bab09f9e80d",      // clave pública de Web3Forms (va en el sitio, no es secreta)
  PRIVACIDAD_VERSION: "2026-10-14",        // súbela cuando cambie privacidad.html
  // Portal de clientes (Supabase → Project Settings → API). Ambos son públicos; la clave service_role NUNCA va aquí.
  // Vacíos = el sitio funciona como antes y /mi-proyecto/ y /panel/ muestran «aún no está activo».
  SUPABASE_URL: "https://qwmxzaeyhqdwndijquab.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_Vy6rXvvmfpVgef9WEod9MA_kK-rJ6TG"                    // clave "anon public"
};

(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Medición con GoatCounter (o Plausible). Si no hay ninguno cargado, no hace nada.
     En GoatCounter el detalle va en la ruta, porque agrupa por ruta: evento/whatsapp_click/barra */
  window.track = (name, props = {}) => {
    try {
      if (window.plausible) window.plausible(name, { props });
      else if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: ["evento", name, ...Object.values(props)].join("/"), title: name, event: true });
    } catch (_) { /* la medición nunca rompe el sitio */ }
  };
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-track]");
    if (a) track(a.dataset.track, { donde: a.dataset.where || location.pathname });
  });

  /* Guarda una fila en Supabase sin cargar la librería (cotizaciones y estimados: el visitante solo puede agregar).
     Nunca rompe el sitio: si no está configurado o falla, no pasa nada. */
  window.guardar = (tabla, fila) => {
    if (!FOUND.SUPABASE_URL || !FOUND.SUPABASE_ANON_KEY) return Promise.resolve(false);
    return fetch(`${FOUND.SUPABASE_URL}/rest/v1/${tabla}`, {
      method: "POST", keepalive: true,
      headers: { apikey: FOUND.SUPABASE_ANON_KEY, Authorization: `Bearer ${FOUND.SUPABASE_ANON_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(fila)
    }).then(r => r.ok).catch(() => false);
  };

  /* Enlaces a WhatsApp con mensaje */
  window.waLink = text => `https://wa.me/${FOUND.WHATSAPP}?text=${encodeURIComponent(text)}`;
  $$("a[data-msg]").forEach(a => { a.href = waLink(a.dataset.msg); });

  /* Menú en celular */
  const menuBtn = $(".menu-btn"), panel = $(".menu-panel");
  if (menuBtn && panel) {
    const close = () => { panel.removeAttribute("data-open"); menuBtn.setAttribute("aria-expanded", "false"); };
    menuBtn.addEventListener("click", () => {
      if (panel.hasAttribute("data-open")) close();
      else { panel.setAttribute("data-open", ""); menuBtn.setAttribute("aria-expanded", "true"); $("a", panel)?.focus(); }
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && panel.hasAttribute("data-open")) { close(); menuBtn.focus(); } });
    document.addEventListener("click", e => { if (!panel.contains(e.target) && e.target !== menuBtn) close(); });
  }

  /* Portada: la ventana escribe "tunegocio.cl", da 404 y se arregla en un sitio real */
  const win = $(".stage .win");
  if (win) {
    const url = $(".win-url-text", win), status = $(".win-status", win);
    const SITE = win.dataset.site || "lasdeliciasdenubi.cl";
    const show = (st, u, code) => { win.dataset.state = st; url.textContent = u; status.textContent = code; };
    if (reduce) show("ok", SITE, "En línea");
    else {
      const type = async (txt) => { for (let i = 1; i <= txt.length; i++) { url.textContent = txt.slice(0, i); await new Promise(r => setTimeout(r, 70)); } };
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      let visible = true;
      document.addEventListener("visibilitychange", () => { visible = !document.hidden; });
      (async function loop() {
        while (true) {
          show("404", "", "buscando…");
          await type("tunegocio.cl");
          await sleep(500); status.textContent = "404";
          await sleep(2600);
          show("ok", SITE, "En línea");
          await sleep(5200);
          while (!visible) await sleep(500);
        }
      })();
    }
  }

  /* Buscador: escribe cómo te buscan y mira el 404 contra el resultado encontrado */
  const typer = $("#busca");
  if (typer) {
    const out404 = $("#r404-title"), outTitle = $("#rok-title"), outUrl = $("#rok-url"), outDesc = $("#rok-desc"), outQ = $("#r404-q"), cta = $("#rok-cta"), acts = $("#rok-actions");
    const RUBROS = [
      { id: "restaurante", n: "restaurante", re: /restaur|picada|pica|sushi|comida|cocin|sanguch|pizz|empanad|cafe|café/, desc: "Carta con precios, reservas en línea y pedidos por WhatsApp.", acts: ["Ver la carta", "Reservar mesa", "WhatsApp"] },
      { id: "barberia", n: "barbería", re: /barber|peluquer|estilist|manicur|uñas|unas|spa|salon|salón|belleza/, desc: "Agenda tu hora en línea, revisa servicios y precios.", acts: ["Agendar hora", "Servicios", "Cómo llegar"] },
      { id: "almacen", n: "almacén", re: /almac|minimarket|negocio|bazar|kiosco|verduler|panader|carnicer|feria/, desc: "Pide en línea con despacho en tu comuna o retira en el local.", acts: ["Hacer pedido", "Despacho", "WhatsApp"] },
      { id: "botilleria", n: "sistema de stock", re: /botiller|licor|bebida|distribuid|ferreter|repuesto|bodega|inventario|stock/, desc: "Stock al día, ventas del día y pedidos a proveedores.", acts: ["Ver productos", "Horario", "WhatsApp"] },
      { id: "eventos", n: "banquetería", re: /pastel|banquet|catering|evento|torta|cumplea|matrimon|reposter|coffee/, desc: "Cotiza tu evento en línea según invitados y menú.", acts: ["Cotizar evento", "Menús", "WhatsApp"] },
      { id: "construccion", n: "construcción", re: /constru|gasfit|electric|maestro|remodel|pintor|carpinter|soldad|techo|obra/, desc: "Trabajos realizados, presupuesto según metros y visita a terreno.", acts: ["Pedir presupuesto", "Trabajos", "WhatsApp"] }
    ];
    const clean = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    let t;
    const render = () => {
      const raw = typer.value.trim().replace(/\s+/g, " ");
      const q = raw || "tu negocio";
      const base = clean(q);
      const slug = base.replace(/\b(en|de|del|la|el|los|las|y)\b/g, " ").replace(/[^a-z0-9]+/g, "").slice(0, 30) || "tunegocio";
      const r = RUBROS.find(x => x.re.test(base));
      outQ.textContent = `“${q}”`;
      out404.textContent = `${slug}.cl`;
      outUrl.textContent = `https://${slug}.cl`;
      outTitle.textContent = cap(q);
      outDesc.textContent = r ? r.desc : "Qué vendes, dónde estás, horarios y cómo escribirte por WhatsApp.";
      acts.replaceChildren(...(r ? r.acts : ["WhatsApp", "Cómo llegar", "Horario"]).map(a => { const s = document.createElement("span"); s.textContent = a; return s; }));
      cta.href = r ? `/ejemplos/?rubro=${r.id}` : "/ejemplos/";
      cta.textContent = r ? `Ver un ejemplo de ${r.n}` : "Ver ejemplos por rubro";
      clearTimeout(t); t = setTimeout(() => raw && track("busca_escrita", { rubro: r ? r.id : "otro" }), 1200);
    };
    typer.addEventListener("input", render);
    $$("[data-fill]").forEach(b => b.addEventListener("click", () => { typer.value = b.dataset.fill; render(); typer.focus(); }));
    render();
  }

  /* Brief: la carpeta abre el formulario en línea */
  const brief = $("#brief");
  if (brief && brief.showModal) {
    let opener = null;
    $$("[data-open-brief]").forEach(b => b.addEventListener("click", () => { opener = b; brief.showModal(); $(".doc-scroll", brief).scrollTop = 0; }));
    $$("[data-close-brief]", brief).forEach(b => b.addEventListener("click", () => brief.close()));
    brief.addEventListener("click", e => { if (e.target === brief) brief.close(); });   // clic fuera del documento
    brief.addEventListener("close", () => opener && opener.focus());
  } else $$("[data-open-brief]").forEach(b => b.addEventListener("click", () => { location.href = "/brief/"; }));

  /* Pasos: en pantallas táctiles, tocar un paso lo resalta */
  $$(".steps li").forEach(li => li.addEventListener("click", () => {
    $$(".steps li").forEach(x => x.classList.toggle("is-on", x === li && !li.classList.contains("is-on")));
  }));

  /* Con movimiento reducido, los videos quedan quietos */
  if (reduce) $$("video[autoplay]").forEach(v => { v.removeAttribute("autoplay"); v.pause(); });
})();
