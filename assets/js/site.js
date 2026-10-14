/* {found} studio · foundstudio.cl
   Comportamiento compartido por todas las páginas. Sin dependencias.
   Configuración: estos tres valores son los únicos que hay que tocar. */
window.FOUND = {
  WHATSAPP: "56942579133",                 // número sin + ni espacios
  WEB3FORMS_KEY: "13ae56a6-e783-4914-9675-7bab09f9e80d",      // clave pública de Web3Forms (va en el sitio, no es secreta)
  PRIVACIDAD_VERSION: "2026-10-14"         // súbela cuando cambie privacidad.html
};

(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Medición: lista para Plausible o GoatCounter. Si no hay ninguno instalado, no hace nada. */
  window.track = (name, props = {}) => {
    try {
      if (window.plausible) window.plausible(name, { props });
      else if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: "evento/" + name, title: JSON.stringify(props), event: true });
    } catch (_) { /* la medición nunca rompe el sitio */ }
  };
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-track]");
    if (a) track(a.dataset.track, { donde: a.dataset.where || location.pathname });
  });

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
    if (reduce) show("ok", SITE, "200 OK");
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
          show("ok", SITE, "200 OK");
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

  /* Con movimiento reducido, los videos quedan quietos */
  if (reduce) $$("video[autoplay]").forEach(v => { v.removeAttribute("autoplay"); v.pause(); });
})();
