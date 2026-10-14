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
  document.documentElement.classList.add("js");

  /* Medición: listo para Plausible o GoatCounter. Si no hay ninguno instalado, no hace nada. */
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
  const wa = text => `https://wa.me/${FOUND.WHATSAPP}?text=${encodeURIComponent(text)}`;
  window.waLink = wa;

  /* Menú en celular */
  const menuBtn = $(".menu-btn"), panel = $(".menu-panel");
  if (menuBtn && panel) {
    const close = () => { panel.removeAttribute("data-open"); menuBtn.setAttribute("aria-expanded", "false"); };
    menuBtn.addEventListener("click", () => {
      const open = panel.hasAttribute("data-open");
      if (open) close(); else { panel.setAttribute("data-open", ""); menuBtn.setAttribute("aria-expanded", "true"); $("a", panel)?.focus(); }
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && panel.hasAttribute("data-open")) { close(); menuBtn.focus(); } });
    document.addEventListener("click", e => { if (!panel.contains(e.target) && e.target !== menuBtn) close(); });
  }

  /* Titular del inicio: las líneas suben cuando la tipografía ya cargó */
  const hl = $$(".hl");
  if (hl.length && !reduce) {
    const pend = [...hl, $(".hero-sub"), $(".hero .bar")].filter(Boolean);
    pend.forEach(el => el.setAttribute("data-pending", ""));
    const go = () => requestAnimationFrame(() => requestAnimationFrame(() => pend.forEach(el => el.removeAttribute("data-pending"))));
    Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 900))]).then(go);
  }

  /* Entradas al hacer scroll: solo lo que todavía no se ve; nada queda oculto si algo falla */
  const items = $$("[data-in]");
  if (items.length && "IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const el = en.target;
        el.style.transitionDelay = (el.dataset.in || 0) + "ms";
        el.classList.add("is-in");
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    items.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight) el.classList.add("is-in"); else io.observe(el);
    });
    // red de seguridad: a los 4 s todo queda visible igual
    setTimeout(() => items.forEach(el => el.classList.add("is-in")), 4000);
  } else items.forEach(el => el.classList.add("is-in"));

  /* Lo vivo del inicio: escribe cómo te buscan y mira cómo te encuentran */
  const typer = $("#busca");
  if (typer) {
    const out404 = $("#r404-title"), outTitle = $("#rok-title"), outUrl = $("#rok-url"), outDesc = $("#rok-desc"), outQ = $("#r404-q"), cta = $("#rok-cta"), acts = $("#rok-actions");
    const RUBROS = [
      { id: "restaurante", re: /restaur|picada|pica|sushi|comida|cocin|sanguch|pizz|empanad|cafe|café/, desc: "Carta con precios, reservas en línea y pedidos por WhatsApp.", acts: ["Ver la carta", "Reservar mesa", "WhatsApp"] },
      { id: "barberia", re: /barber|peluquer|estilist|manicur|uñas|unas|spa|salon|salón/, desc: "Agenda tu hora en línea, revisa servicios y precios.", acts: ["Agendar hora", "Servicios", "Cómo llegar"] },
      { id: "almacen", re: /almac|minimarket|negocio|bazar|kiosco|verduler|panader|carnicer|feria/, desc: "Pide en línea con despacho en tu comuna o retira en el local.", acts: ["Hacer pedido", "Despacho", "WhatsApp"] },
      { id: "botilleria", re: /botiller|licor|bebida|distribuid|ferreter|repuesto|bodega|inventario|stock/, desc: "Stock al día, ventas del día y pedidos a proveedores.", acts: ["Ver productos", "Horario", "WhatsApp"] },
      { id: "eventos", re: /pastel|banquet|catering|evento|torta|cumplea|matrimon|reposter|coffee/, desc: "Cotiza tu evento en línea según invitados y menú.", acts: ["Cotizar evento", "Menús", "WhatsApp"] },
      { id: "construccion", re: /constru|gasfit|electric|maestro|remodel|pintor|carpinter|soldad|techo|obra/, desc: "Trabajos realizados, presupuesto según metros y visita a terreno.", acts: ["Pedir presupuesto", "Trabajos", "WhatsApp"] }
    ];
    const clean = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    let t;
    const render = () => {
      const raw = typer.value.trim().replace(/\s+/g, " ");
      const q = raw || "tu negocio";
      const base = clean(q);
      const slug = (base.replace(/\b(en|de|del|la|el|los|las|y)\b/g, " ").replace(/[^a-z0-9]+/g, "")).slice(0, 30) || "tunegocio";
      const r = RUBROS.find(x => x.re.test(base));
      outQ.textContent = `“${q}”`;
      out404.textContent = `${slug}.cl`;
      outUrl.textContent = `https://${slug}.cl`;
      outTitle.textContent = cap(q);
      outDesc.textContent = r ? r.desc : "Qué vendes, dónde estás, horarios y cómo escribirte por WhatsApp.";
      acts.innerHTML = "";
      (r ? r.acts : ["WhatsApp", "Cómo llegar", "Horario"]).forEach(a => { const s = document.createElement("span"); s.textContent = a; acts.appendChild(s); });
      cta.href = r ? `/ejemplos/?rubro=${r.id}` : "/ejemplos/";
      cta.textContent = r ? `Ver un ejemplo de ${({ restaurante: "restaurante", barberia: "barbería", almacen: "almacén", botilleria: "sistema de stock", eventos: "banquetería", construccion: "construcción" })[r.id]}` : "Ver ejemplos por rubro";
      clearTimeout(t); t = setTimeout(() => raw && track("busca_escrita", { rubro: r ? r.id : "otro" }), 1200);
    };
    typer.addEventListener("input", render);
    $$("[data-fill]").forEach(b => b.addEventListener("click", () => { typer.value = b.dataset.fill; render(); typer.focus(); }));
    render();
  }

  /* Un campo y nada más: lo escrito sale por WhatsApp */
  $$("form[data-wa]").forEach(f => {
    f.addEventListener("submit", e => {
      e.preventDefault();
      const v = f.elements.q.value.trim();
      const text = v ? `Hola {found}, quiero cotizar. Mi negocio: ${v}` : "Hola {found}, quiero cotizar una página para mi negocio.";
      track("whatsapp_click", { donde: "campo-contacto" });
      window.open(wa(text), "_blank", "noopener");
    });
  });

  /* Libro mayor: vista previa al pasar o enfocar una fila */
  const ledger = $(".ledger"), prev = $(".preview");
  if (ledger && prev) {
    const show = row => {
      if (!row.dataset.img) return;
      prev.src = row.dataset.img; prev.alt = row.dataset.alt || "";
      prev.style.top = (row.getBoundingClientRect().top - ledger.getBoundingClientRect().top - 40) + "px";
      prev.setAttribute("data-on", "");
    };
    $$(".row", ledger).forEach(row => {
      row.addEventListener("mouseenter", () => show(row));
      row.addEventListener("focus", () => show(row));
    });
    ledger.addEventListener("mouseleave", () => prev.removeAttribute("data-on"));
    ledger.addEventListener("focusout", e => { if (!ledger.contains(e.relatedTarget)) prev.removeAttribute("data-on"); });
  }

  /* Con movimiento reducido, los videos quedan quietos en su primer cuadro */
  if (reduce) $$("video[autoplay]").forEach(v => { v.removeAttribute("autoplay"); v.pause(); });

  /* Enlaces de WhatsApp genéricos: añade el mensaje indicado en data-msg */
  $$("a[data-msg]").forEach(a => { a.href = wa(a.dataset.msg); });
})();
