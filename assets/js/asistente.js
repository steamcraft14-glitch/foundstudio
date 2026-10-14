/* {found} studio · Asistente de estimado (chat guiado, sin IA).
   Funciona solo en el navegador: no envía nada a ningún servidor. Al final, el cliente elige
   mandar el resumen por WhatsApp o llevarlo al formulario de cotización.

   ============ RANGOS DE PRECIO (CLP) ============
   Edita estos valores cuando quieras. Son rangos de referencia: el asistente siempre aclara
   que el valor final va en la cotización. [mínimo, máximo] */
const RANGOS = {
  pagina: {
    simple: [150000, 230000],       // una página con todo lo esencial
    varias: [260000, 450000]        // varias secciones o páginas
  },
  extrasPagina: {
    reservas: [60000, 120000],      // agenda u horas en línea
    catalogo: [40000, 90000],       // carta, catálogo o lista de precios
    cotizador: [50000, 110000],     // cotizador o calculadora
    galeria: [20000, 50000]         // galería de trabajos
  },
  tienda: {
    pocos: [450000, 650000],        // menos de 30 productos
    medio: [600000, 900000],        // entre 30 y 100
    muchos: [850000, 1300000]       // más de 100
  },
  despacho: [40000, 80000],         // despacho por comuna en la tienda
  sistema: {
    base: [550000, 850000],         // primer módulo
    moduloExtra: [120000, 250000],  // cada módulo adicional
    usuarios: { pocos: [0, 0], medio: [100000, 200000], muchos: [250000, 450000] }
  },
  logo: [80000, 150000],            // si no tiene logo
  recargoUrgente: 0.2               // +20 % si es urgente
};
const PLAZOS = { simple: "alrededor de 1 semana", varias: "2 a 3 semanas", tienda: "3 a 4 semanas", sistema: "4 a 8 semanas" };

(() => {
  "use strict";
  const clp = n => "$" + (Math.round(n / 10000) * 10000).toLocaleString("es-CL");
  const sum = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const wait = ms => new Promise(r => setTimeout(r, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ms));
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const ICON_RESET = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

  const RUBROS = [
    ["restaurante", "Restaurante o comida"], ["barberia", "Barbería o belleza"], ["almacen", "Almacén o minimarket"],
    ["botilleria", "Botillería"], ["eventos", "Banquetería o eventos"], ["construccion", "Construcción o servicios"], ["otro", "Otro"]
  ];
  const EXTRAS = [["reservas", "Reservas o agenda"], ["catalogo", "Carta o catálogo"], ["cotizador", "Cotizador"], ["galeria", "Galería de trabajos"]];
  const SUGERIDOS = { restaurante: ["catalogo", "reservas"], barberia: ["reservas"], almacen: ["catalogo"], eventos: ["cotizador", "galeria"], construccion: ["galeria", "cotizador"], botilleria: ["catalogo"] };
  const MODULOS = [["inventario", "Inventario y stock"], ["ventas", "Ventas y caja"], ["reservas", "Reservas o agenda"], ["cotizaciones", "Cotizaciones"], ["clientes", "Clientes"]];
  const NOMBRE = Object.fromEntries([...RUBROS, ...EXTRAS, ...MODULOS]);

  class Asistente {
    constructor(root, { onClose } = {}) {
      this.root = root; this.onClose = onClose;
      root.classList.add("chat");
      root.innerHTML = "";
      const head = el("div", "chat-head");
      const av = el("div", "chat-avatar"); av.innerHTML = '<img src="/assets/brand/found-icono.svg" alt="" width="30" height="24">';
      const who = el("div", "chat-who"); who.append(el("strong", null, "Asistente {found}"), el("span", null, "Estimado en 1 minuto"));
      const reset = el("button", "chat-icon"); reset.type = "button"; reset.setAttribute("aria-label", "Empezar de nuevo"); reset.innerHTML = ICON_RESET;
      reset.addEventListener("click", () => this.start());
      head.append(av, who, reset);
      if (onClose) { const x = el("button", "chat-icon"); x.type = "button"; x.setAttribute("aria-label", "Cerrar asistente"); x.innerHTML = ICON_CLOSE; x.addEventListener("click", onClose); head.append(x); }
      this.log = el("div", "chat-log"); this.log.setAttribute("role", "log"); this.log.setAttribute("aria-live", "polite"); this.log.setAttribute("aria-label", "Conversación");
      this.opts = el("div", "chat-opts");
      root.append(head, this.log, this.opts);
      this.started = false;
    }

    async say(text, delay = 650) {
      const t = el("div", "typing"); t.setAttribute("aria-hidden", "true"); t.innerHTML = "<i></i><i></i><i></i>";
      this.log.append(t); this.scroll();
      await wait(delay);
      t.remove();
      const m = el("p", "msg msg-bot", text); this.log.append(m); this.scroll();
    }
    me(text) { this.log.append(el("p", "msg msg-me", text)); this.scroll(); }
    scroll() { this.log.scrollTop = this.log.scrollHeight; }
    clearOpts() { this.opts.innerHTML = ""; }
    focusOpts() { const b = this.opts.querySelector("button, input"); if (b && this.root.isConnected && this.wantsFocus) b.focus({ preventScroll: true }); }

    choose(options) {
      return new Promise(res => {
        this.clearOpts();
        options.forEach(([v, label]) => {
          const b = el("button", "opt", label); b.type = "button";
          b.addEventListener("click", () => { this.clearOpts(); this.me(label); res(v); });
          this.opts.append(b);
        });
        this.focusOpts();
      });
    }
    chooseMany(options, preset = [], goLabel = "Listo") {
      return new Promise(res => {
        this.clearOpts();
        const sel = new Set(preset);
        const go = el("button", "opt opt-go", goLabel); go.type = "button";
        options.forEach(([v, label]) => {
          const b = el("button", "opt", label); b.type = "button"; b.setAttribute("aria-pressed", sel.has(v));
          b.addEventListener("click", () => { sel.has(v) ? sel.delete(v) : sel.add(v); b.setAttribute("aria-pressed", sel.has(v)); });
          this.opts.append(b);
        });
        go.addEventListener("click", () => {
          const list = [...sel]; this.clearOpts();
          this.me(list.length ? list.map(v => NOMBRE[v]).join(", ") : "Ninguna de esas"); res(list);
        });
        this.opts.append(go); this.focusOpts();
      });
    }
    ask(placeholder) {
      return new Promise(res => {
        this.clearOpts();
        const f = el("form", "chat-text"); const i = el("input"); i.type = "text"; i.placeholder = placeholder; i.maxLength = 60; i.setAttribute("aria-label", placeholder);
        const b = el("button", "opt opt-go", "Enviar"); b.type = "submit";
        f.append(i, b);
        f.addEventListener("submit", e => { e.preventDefault(); const v = i.value.trim(); if (!v) { i.focus(); return; } this.clearOpts(); this.me(v); res(v); });
        this.opts.append(f); this.focusOpts();
      });
    }

    async start(focus = false) {
      this.wantsFocus = focus || this.wantsFocus;
      this.run = (this.run || 0) + 1; const run = this.run;
      this.log.innerHTML = ""; this.clearOpts(); this.started = true;
      const s = this.s = { extras: [], modulos: [] };
      const alive = () => run === this.run;
      track("asistente_inicio");

      await this.say("¡Hola! Soy el asistente de {found}. Te hago unas preguntas rápidas y te doy un estimado de cuánto costaría tu proyecto.", 500); if (!alive()) return;
      await this.say("Para partir, ¿qué tipo de negocio tienes?"); if (!alive()) return;
      s.rubro = await this.choose(RUBROS); if (!alive()) return;
      if (s.rubro === "otro") { await this.say("¡Buena! ¿A qué se dedica tu negocio?"); if (!alive()) return; s.rubroTxt = await this.ask("Ej: veterinaria, taller mecánico"); if (!alive()) return; }

      await this.say("¿Qué te gustaría tener?"); if (!alive()) return;
      s.servicio = await this.choose([["pagina", "Una página web"], ["tienda", "Vender por internet"], ["sistema", "Un sistema para ordenar mi negocio"], ["nose", "No estoy seguro"]]); if (!alive()) return;
      if (s.servicio === "nose") {
        await this.say("Tranqui, te ayudo. ¿Qué es lo más importante para ti ahora?"); if (!alive()) return;
        s.servicio = await this.choose([["pagina", "Que me encuentren y me escriban"], ["tienda", "Vender y recibir pagos en línea"], ["sistema", "Controlar stock, ventas o reservas"]]); if (!alive()) return;
      }

      if (s.servicio === "pagina") {
        await this.say("¿Qué tan grande la imaginas?"); if (!alive()) return;
        s.tamano = await this.choose([["simple", "Una página con lo esencial"], ["varias", "Varias secciones o páginas"]]); if (!alive()) return;
        await this.say("¿Qué funciones te servirían? Puedes marcar varias. Te dejé marcadas las típicas de tu rubro."); if (!alive()) return;
        s.extras = await this.chooseMany(EXTRAS, SUGERIDOS[s.rubro] || []); if (!alive()) return;
      } else if (s.servicio === "tienda") {
        await this.say("¿Cuántos productos venderías, más o menos?"); if (!alive()) return;
        s.productos = await this.choose([["pocos", "Menos de 30"], ["medio", "Entre 30 y 100"], ["muchos", "Más de 100"]]); if (!alive()) return;
        await this.say("¿Cómo entregarías los pedidos?"); if (!alive()) return;
        s.despacho = await this.choose([["si", "Despacho a domicilio"], ["no", "Solo retiro en el local"]]); if (!alive()) return;
      } else {
        await this.say("¿Qué quieres controlar con el sistema? Marca todo lo que necesites."); if (!alive()) return;
        s.modulos = await this.chooseMany(MODULOS, s.rubro === "botilleria" || s.rubro === "almacen" ? ["inventario", "ventas"] : s.rubro === "barberia" ? ["reservas"] : []); if (!alive()) return;
        if (!s.modulos.length) s.modulos = ["inventario"];
        await this.say("¿Cuántas personas lo usarían?"); if (!alive()) return;
        s.usuarios = await this.choose([["pocos", "1 o 2 personas"], ["medio", "De 3 a 10"], ["muchos", "Más de 10"]]); if (!alive()) return;
      }

      await this.say("¿Ya tienes logo?"); if (!alive()) return;
      s.logo = await this.choose([["si", "Sí, ya tengo"], ["no", "No, necesito uno"]]); if (!alive()) return;
      await this.say("Última: ¿para cuándo lo necesitas?"); if (!alive()) return;
      s.plazo = await this.choose([["normal", "Sin apuro"], ["pronto", "En las próximas semanas"], ["urgente", "Es urgente"]]); if (!alive()) return;

      await this.say("Listo, estoy calculando…", 900); if (!alive()) return;
      this.result();
    }

    calc() {
      const s = this.s; let r = [0, 0]; const incluye = []; let plazo;
      if (s.servicio === "pagina") {
        r = RANGOS.pagina[s.tamano]; plazo = PLAZOS[s.tamano];
        incluye.push(s.tamano === "simple" ? "Página con lo esencial de tu negocio" : "Sitio con varias secciones o páginas", "Diseño para celular, WhatsApp y Google Maps", "Dominio .cl el primer año");
        s.extras.forEach(x => { r = sum(r, RANGOS.extrasPagina[x]); incluye.push(NOMBRE[x]); });
      } else if (s.servicio === "tienda") {
        r = RANGOS.tienda[s.productos]; plazo = PLAZOS.tienda;
        incluye.push("Tienda online con carro de compras", "Pago con tarjeta o transferencia", "Dominio .cl el primer año");
        if (s.despacho === "si") { r = sum(r, RANGOS.despacho); incluye.push("Despacho por comuna"); }
      } else {
        r = RANGOS.sistema.base; plazo = PLAZOS.sistema;
        s.modulos.slice(1).forEach(() => { r = sum(r, RANGOS.sistema.moduloExtra); });
        r = sum(r, RANGOS.sistema.usuarios[s.usuarios]);
        incluye.push(...s.modulos.map(m => NOMBRE[m]), "Para computador y celular");
      }
      if (s.logo === "no") { r = sum(r, RANGOS.logo); incluye.push("Diseño de logo"); }
      if (s.plazo === "urgente") r = [r[0] * (1 + RANGOS.recargoUrgente), r[1] * (1 + RANGOS.recargoUrgente)];
      return { r, incluye, plazo };
    }

    result() {
      const s = this.s, { r, incluye, plazo } = this.calc();
      const rubro = s.rubro === "otro" ? s.rubroTxt : NOMBRE[s.rubro];
      const servicio = { pagina: "Página web", tienda: "Tienda online", sistema: "Sistema a medida" }[s.servicio];
      const rango = `${clp(r[0])} a ${clp(r[1])}`;
      const resumen = `${servicio} para ${rubro.toLowerCase()}: ${incluye.join(", ")}. Plazo: ${s.plazo === "urgente" ? "urgente" : plazo}. Estimado del asistente: ${rango}.`;

      const card = el("div", "estimate");
      card.append(el("small", null, `Estimado para tu ${servicio.toLowerCase()}`), el("p", "range", rango),
        el("p", "plazo", s.plazo === "urgente" ? `Plazo: lo priorizamos (normalmente ${plazo})` : `Plazo: ${plazo}`));
      const ul = el("ul"); incluye.forEach(i => ul.append(el("li", null, i))); card.append(ul);
      card.append(el("p", "fine", "Es un rango de referencia. Te enviamos la cotización exacta, gratis y por escrito, en menos de 24 horas."));
      const btns = el("div", "btns");
      const wa = el("a", "btn", "Enviar por WhatsApp"); wa.href = waLink(`Hola {found}, usé el asistente de su página. ${resumen}`); wa.target = "_blank"; wa.rel = "noopener";
      wa.addEventListener("click", () => track("whatsapp_click", { donde: "asistente", servicio: s.servicio }));
      const form = el("a", "btn btn-ghost", "Pedir cotización formal");
      const rubroForm = RUBROS.some(([v]) => v === s.rubro) ? s.rubro : "otro";
      form.href = `/contacto/?rubro=${rubroForm}&servicio=${s.servicio === "sistema" ? "software" : s.servicio}&resumen=${encodeURIComponent(resumen)}`;
      form.addEventListener("click", () => track("cta_cotizar", { donde: "asistente" }));
      btns.append(wa, form); card.append(btns);
      this.log.append(card); this.scroll();
      track("asistente_estimado", { servicio: s.servicio, rubro: s.rubro });
      this.say("¿Quieres que lo veamos juntos? Escríbenos y lo afinamos a tu medida.", 700).then(() => {
        this.clearOpts();
        const again = el("button", "opt", "Calcular otro proyecto"); again.type = "button"; again.addEventListener("click", () => this.start(true));
        this.opts.append(again);
      });
    }
  }

  /* Asistentes en línea (por ejemplo, en el inicio) */
  document.querySelectorAll("[data-asistente]").forEach(box => {
    const a = new Asistente(box);
    const io = "IntersectionObserver" in window ? new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); if (!a.started) a.start(); } }, { threshold: .3 }) : null;
    if (io) io.observe(box); else a.start();
    box.addEventListener("pointerdown", () => { a.wantsFocus = true; }, { once: true });
  });

  /* Botón flotante + panel en todas las páginas */
  const fab = document.createElement("button");
  fab.className = "chat-fab"; fab.type = "button"; fab.setAttribute("aria-haspopup", "dialog");
  fab.innerHTML = '<span class="fab-ic"><img src="/assets/brand/found-icono.svg" alt="" width="30" height="24"></span><span class="fab-txt">Calcula tu estimado</span>';
  const panel = document.createElement("div");
  panel.className = "chat-panel"; panel.hidden = true; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Asistente de estimado");
  const box = document.createElement("div"); panel.append(box);
  document.body.append(fab, panel);
  let a = null;
  const open = () => {
    panel.hidden = false; fab.hidden = true;
    if (!a) a = new Asistente(box, { onClose: close });
    a.wantsFocus = true;
    if (!a.started) a.start(true); else (a.opts.querySelector("button, input") || box.querySelector(".chat-icon")).focus();
  };
  const close = () => { panel.hidden = true; fab.hidden = false; fab.focus(); };
  fab.addEventListener("click", open);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !panel.hidden) close(); });
  document.querySelectorAll("[data-open-asistente]").forEach(b => b.addEventListener("click", e => { e.preventDefault(); open(); }));
})();
