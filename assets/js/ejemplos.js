/* {found} studio · /ejemplos/
   Seis negocios ficticios que se pueden tocar. Todo es de ejemplo: nombres, precios y horarios. */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clp = n => "$" + Math.round(n).toLocaleString("es-CL");
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  const RUBROS = {
    restaurante: {
      tab: "Restaurante", titulo: "Restaurante", servicio: "pagina",
      lead: "Que vean la carta antes de llegar y reserven mesa sin llamar.",
      incluye: ["Carta con precios, fácil de actualizar", "Reservas con hora y número de personas", "Ubicación en Google Maps y horario", "Botón de WhatsApp para pedidos"],
      url: "elmeson.cl"
    },
    barberia: {
      tab: "Barbería", titulo: "Barbería", servicio: "pagina",
      lead: "Que tus clientes agenden su hora solos, también de noche.",
      incluye: ["Agenda de horas por día", "Servicios y precios a la vista", "Recordatorio por WhatsApp", "Fotos de tus cortes"],
      url: "barberianavaja.cl"
    },
    almacen: {
      tab: "Almacén", titulo: "Almacén", servicio: "tienda",
      lead: "Que tus vecinos te pidan por internet y tú solo prepares el pedido.",
      incluye: ["Catálogo con precios y fotos", "Carro de compras", "Despacho por comuna o retiro en el local", "Pedido que llega ordenado a tu WhatsApp"],
      url: "almacenlavecina.cl"
    },
    botilleria: {
      tab: "Botillería", titulo: "Sistema de stock", servicio: "software",
      lead: "Deja el cuaderno: el stock se descuenta solo con cada venta.",
      incluye: ["Inventario con aviso de stock bajo", "Ventas y caja del día", "Pedido al proveedor por WhatsApp", "Funciona en el computador del mesón y en el celular"],
      url: "app.botilleriaelhielo.cl"
    },
    eventos: {
      tab: "Banquetería", titulo: "Banquetería", servicio: "pagina",
      lead: "Que el cliente arme su evento y te llegue la cotización lista.",
      incluye: ["Cotizador por invitados y menú", "Galería de eventos realizados", "Formulario con fecha y lugar", "Respuesta rápida por WhatsApp"],
      url: "mantellargo.cl"
    },
    construccion: {
      tab: "Construcción", titulo: "Construcción", servicio: "pagina",
      lead: "Un presupuesto aproximado al tiro, y la visita a terreno agendada.",
      incluye: ["Calculadora por metros cuadrados", "Trabajos realizados con fotos", "Solicitud de visita a terreno", "Zona de cobertura por comuna"],
      url: "plomada.cl"
    }
  };

  /* ---------- cada negocio ---------- */
  const DEMOS = {
    restaurante(root) {
      const carta = {
        Entradas: [["Empanada de pino", 2800], ["Sopaipillas con pebre", 2500], ["Machas a la parmesana", 8900]],
        Fondos: [["Cazuela de vacuno", 7900], ["Pastel de choclo", 8500], ["Plateada con puré picante", 9900]],
        Postres: [["Leche asada", 3200], ["Mote con huesillo", 2900]]
      };
      let tab = "Fondos", pax = 2, hora = "20:00";
      const horas = ["13:00", "13:30", "14:00", "20:00", "20:30", "21:00"];
      const draw = () => {
        root.innerHTML = `
          <header class="d-head"><p class="d-name">El Mesón</p><p class="d-meta">Cocina chilena · abierto hoy hasta las 23:00</p></header>
          <section class="d-sec"><h3 class="d-h">La carta</h3>
            <div class="d-tabs" role="group" aria-label="Sección de la carta">${Object.keys(carta).map(k => `<button type="button" data-tab="${k}" aria-pressed="${k === tab}">${k}</button>`).join("")}</div>
            <ul class="d-menu">${carta[tab].map(([n, p]) => `<li><span>${n}</span><span>${clp(p)}</span></li>`).join("")}</ul>
          </section>
          <section class="d-sec d-alt"><h3 class="d-h">Reserva tu mesa</h3>
            <div class="d-row"><span>Personas</span><div class="d-step"><button type="button" data-pax="-1" aria-label="Una persona menos">−</button><output aria-live="polite">${pax}</output><button type="button" data-pax="1" aria-label="Una persona más">+</button></div></div>
            <div class="d-slots" role="group" aria-label="Hora">${horas.map(h => `<button type="button" data-hora="${h}" aria-pressed="${h === hora}">${h}</button>`).join("")}</div>
            <button type="button" class="d-cta" data-reservar>Reservar mesa</button>
            <p class="d-ok" role="status"></p>
          </section>`;
      };
      draw();
      root.addEventListener("click", e => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.dataset.tab) { tab = b.dataset.tab; draw(); $(`[data-tab="${tab}"]`, root).focus(); }
        else if (b.dataset.pax) { pax = Math.min(12, Math.max(1, pax + +b.dataset.pax)); $("output", root).textContent = pax; }
        else if (b.dataset.hora) { hora = b.dataset.hora; $$("[data-hora]", root).forEach(x => x.setAttribute("aria-pressed", x === b)); }
        else if ("reservar" in b.dataset) { $(".d-ok", root).textContent = `¡Listo! Mesa para ${pax} ${pax === 1 ? "persona" : "personas"} a las ${hora}. Te confirmamos por WhatsApp.`; track("demo_interaccion", { rubro: "restaurante" }); }
      });
    },

    barberia(root) {
      const servicios = [["Corte", 8000], ["Corte y barba", 12000], ["Barba", 6000]];
      const slots = ["10:00", "10:45", "11:30", "12:15", "15:00", "15:45", "16:30", "17:15", "18:00"];
      const ocupadas = { Hoy: new Set(["10:00", "11:30", "16:30"]), Mañana: new Set(["12:15", "17:15"]) };
      let dia = "Hoy", serv = 0, hora = null;
      const draw = () => {
        root.innerHTML = `
          <header class="d-head"><p class="d-name">NAVAJA</p><p class="d-meta">Barbería · reserva en línea</p></header>
          <section class="d-sec"><h3 class="d-h">Servicio</h3>
            <div class="d-list" role="group" aria-label="Servicio">${servicios.map(([n, p], i) => `<button type="button" data-serv="${i}" aria-pressed="${i === serv}"><span>${n}</span><span>${clp(p)}</span></button>`).join("")}</div>
          </section>
          <section class="d-sec"><h3 class="d-h">Día y hora</h3>
            <div class="d-tabs" role="group" aria-label="Día">${["Hoy", "Mañana"].map(d => `<button type="button" data-dia="${d}" aria-pressed="${d === dia}">${d}</button>`).join("")}</div>
            <div class="d-slots" role="group" aria-label="Hora">${slots.map(h => { const oc = ocupadas[dia].has(h); return `<button type="button" data-hora="${h}" ${oc ? "disabled" : ""} aria-pressed="${h === hora}">${h}${oc ? '<span class="sr"> ocupada</span>' : ""}</button>`; }).join("")}</div>
            <button type="button" class="d-cta" data-agendar ${hora ? "" : "disabled"}>Agendar ${hora ? "a las " + hora : ""}</button>
            <p class="d-ok" role="status"></p>
          </section>`;
      };
      draw();
      root.addEventListener("click", e => {
        const b = e.target.closest("button"); if (!b || b.disabled) return;
        if (b.dataset.serv) { serv = +b.dataset.serv; draw(); $(`[data-serv="${serv}"]`, root).focus(); }
        else if (b.dataset.dia) { dia = b.dataset.dia; hora = null; draw(); $(`[data-dia="${dia}"]`, root).focus(); }
        else if (b.dataset.hora) { hora = b.dataset.hora; draw(); $(`[data-hora="${hora}"]`, root).focus(); }
        else if ("agendar" in b.dataset && hora) {
          ocupadas[dia].add(hora); // la hora queda tomada de verdad
          const msg = `Agendado: ${servicios[serv][0]} ${dia.toLowerCase()} a las ${hora}. Te llega un recordatorio por WhatsApp.`;
          hora = null; draw(); $(".d-ok", root).textContent = msg; track("demo_interaccion", { rubro: "barberia" });
        }
      });
    },

    almacen(root) {
      const prods = [["Pan amasado (1 kg)", 2200], ["Leche entera (1 L)", 1090], ["Huevos (12 un.)", 3800], ["Paltas (1 kg)", 4500], ["Bebida (3 L)", 2990], ["Queso gauda (250 g)", 3200]];
      const cant = prods.map(() => 0); const META = 15000;
      root.innerHTML = `
        <header class="d-head d-photo"><img src="/assets/img/mundo/feria-verduras-800.webp" width="800" height="600" alt="Puesto de verduras y frutas en una feria libre"><div><p class="d-name">Almacén La Vecina</p><p class="d-meta">Despacho en tu comuna hoy mismo</p></div></header>
        <section class="d-sec"><h3 class="d-h">Lo más pedido</h3>
          <ul class="d-prods">${prods.map(([n, p], i) => `<li><span class="d-pn">${n}<small>${clp(p)}</small></span><span class="d-step"><button type="button" data-i="${i}" data-d="-1" aria-label="Quitar ${n}">−</button><output data-o="${i}">0</output><button type="button" data-i="${i}" data-d="1" aria-label="Agregar ${n}">+</button></span></li>`).join("")}</ul>
        </section>
        <section class="d-sec d-alt d-cart" aria-live="polite">
          <div class="d-row"><strong>Total</strong><strong data-total>$0</strong></div>
          <div class="d-meter" aria-hidden="true"><span data-bar></span></div>
          <p class="d-small" data-falta>Te faltan ${clp(META)} para el despacho gratis.</p>
          <button type="button" class="d-cta" data-pedir disabled>Pedir por WhatsApp</button>
          <p class="d-ok" role="status"></p>
        </section>`;
      const upd = () => {
        const tot = prods.reduce((s, [, p], i) => s + p * cant[i], 0);
        $("[data-total]", root).textContent = clp(tot);
        $("[data-bar]", root).style.width = Math.min(100, tot / META * 100) + "%";
        $("[data-falta]", root).textContent = tot >= META ? "¡Tienes despacho gratis!" : `Te faltan ${clp(META - tot)} para el despacho gratis.`;
        $("[data-pedir]", root).disabled = !tot;
      };
      root.addEventListener("click", e => {
        const b = e.target.closest("button"); if (!b || b.disabled) return;
        if (b.dataset.i) { const i = +b.dataset.i; cant[i] = Math.max(0, cant[i] + +b.dataset.d); $(`[data-o="${i}"]`, root).textContent = cant[i]; upd(); }
        else if ("pedir" in b.dataset) {
          const items = prods.map(([n], i) => cant[i] ? `${cant[i]} × ${n}` : "").filter(Boolean).join(", ");
          $(".d-ok", root).textContent = `Tu pedido llega así al WhatsApp del almacén: “${items}”.`; track("demo_interaccion", { rubro: "almacen" });
        }
      });
    },

    botilleria(root) {
      const stock = [["Hielo 2 kg", 9, 1500], ["Cerveza lata 470 cc", 48, 1290], ["Bebida 3 L", 7, 2990], ["Vino reserva 750 cc", 5, 5990], ["Papas fritas 250 g", 12, 2490]];
      let ventas = 0, n = 0;
      root.innerHTML = `
        <header class="d-head"><p class="d-name">El Hielo · Inventario</p><p class="d-meta">Sistema de mesón · hoy</p></header>
        <section class="d-sec d-kpis"><div><small>Ventas de hoy</small><strong data-v>$0</strong></div><div><small>Boletas</small><strong data-n>0</strong></div></section>
        <section class="d-sec"><h3 class="d-h">Stock</h3>
          <ul class="d-stock">${stock.map(([nom], i) => `<li data-r="${i}"><span class="d-pn">${nom}<small data-s="${i}"></small></span><span class="d-btns"><button type="button" data-vender="${i}">Vender</button><button type="button" data-rep="${i}" aria-label="Reponer 12 de ${nom}">+12</button></span></li>`).join("")}</ul>
          <p class="d-ok" role="status"></p>
        </section>`;
      const upd = () => {
        stock.forEach(([nom, s], i) => {
          const el = $(`[data-s="${i}"]`, root), li = $(`[data-r="${i}"]`, root);
          el.textContent = s === 0 ? "Agotado" : s < 6 ? `Quedan ${s}: pedir al proveedor` : `${s} en stock`;
          li.dataset.state = s === 0 ? "out" : s < 6 ? "low" : "ok";
          $(`[data-vender="${i}"]`, root).disabled = s === 0;
        });
        $("[data-v]", root).textContent = clp(ventas); $("[data-n]", root).textContent = n;
      };
      upd();
      root.addEventListener("click", e => {
        const b = e.target.closest("button"); if (!b || b.disabled) return;
        if (b.dataset.vender) { const i = +b.dataset.vender; stock[i][1]--; ventas += stock[i][2]; n++; upd();
          $(".d-ok", root).textContent = stock[i][1] === 0 ? `${stock[i][0]} se agotó. Se envió el pedido al proveedor por WhatsApp.` : stock[i][1] < 6 ? `Aviso: quedan ${stock[i][1]} de ${stock[i][0]}.` : `Venta registrada: ${stock[i][0]}.`;
          track("demo_interaccion", { rubro: "botilleria" }); }
        else if (b.dataset.rep) { const i = +b.dataset.rep; stock[i][1] += 12; upd(); $(".d-ok", root).textContent = `Repuesto: ${stock[i][0]}, ahora ${stock[i][1]}.`; }
      });
    },

    eventos(root) {
      const menus = [["Cóctel", 9900], ["Almuerzo", 16900], ["Once", 7500]];
      const extras = [["Garzones", 60000], ["Torta de novios", 45000], ["Mantelería", 30000]];
      let inv = 60, menu = 0; const ex = new Set();
      root.innerHTML = `
        <header class="d-head"><p class="d-name">Mantel Largo</p><p class="d-meta">Banquetería para matrimonios y empresas</p></header>
        <section class="d-sec"><h3 class="d-h">Cotiza tu evento</h3>
          <label class="d-lab" for="d-inv">Invitados: <output data-inv>${inv}</output></label>
          <input id="d-inv" type="range" min="20" max="200" step="10" value="${inv}">
          <div class="d-list" role="group" aria-label="Menú">${menus.map(([m, p], i) => `<button type="button" data-menu="${i}" aria-pressed="${i === menu}"><span>${m}</span><span>${clp(p)} p/p</span></button>`).join("")}</div>
          <div class="d-checks">${extras.map(([x, p], i) => `<label><input type="checkbox" data-ex="${i}"> ${x} <small>+${clp(p)}</small></label>`).join("")}</div>
        </section>
        <section class="d-sec d-alt"><div class="d-row"><span>Total estimado</span><strong class="d-big" data-tot></strong></div>
          <button type="button" class="d-cta" data-cot>Pedir cotización formal</button><p class="d-ok" role="status"></p></section>`;
      const upd = () => { let t = inv * menus[menu][1]; ex.forEach(i => t += extras[i][1]); $("[data-tot]", root).textContent = clp(t); $("[data-inv]", root).textContent = inv; };
      upd();
      $("#d-inv", root).addEventListener("input", e => { inv = +e.target.value; upd(); });
      root.addEventListener("change", e => { const c = e.target.closest("[data-ex]"); if (c) { c.checked ? ex.add(+c.dataset.ex) : ex.delete(+c.dataset.ex); upd(); } });
      root.addEventListener("click", e => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.dataset.menu) { menu = +b.dataset.menu; $$("[data-menu]", root).forEach(x => x.setAttribute("aria-pressed", x === b)); upd(); }
        else if ("cot" in b.dataset) { $(".d-ok", root).textContent = `Recibimos tu solicitud: ${inv} invitados, ${menus[menu][0].toLowerCase()}. Te enviamos la cotización formal por correo.`; track("demo_interaccion", { rubro: "eventos" }); }
      });
    },

    construccion(root) {
      const tipos = [["Pintura interior", 4500], ["Cerámica de piso", 18000], ["Cambio de techumbre", 32000]];
      let tipo = 0, m2 = 40;
      root.innerHTML = `
        <header class="d-head"><p class="d-name">PLOMADA</p><p class="d-meta">Construcción y remodelación · zona norte de Santiago</p></header>
        <section class="d-sec"><h3 class="d-h">Presupuesto aproximado</h3>
          <div class="d-list" role="group" aria-label="Tipo de trabajo">${tipos.map(([t, p], i) => `<button type="button" data-tipo="${i}" aria-pressed="${i === tipo}"><span>${t}</span><span>${clp(p)} m²</span></button>`).join("")}</div>
          <label class="d-lab" for="d-m2">Metros cuadrados: <output data-m2>${m2}</output></label>
          <input id="d-m2" type="range" min="10" max="200" step="5" value="${m2}">
        </section>
        <section class="d-sec d-alt"><div class="d-row"><span>Aproximado</span><strong class="d-big" data-tot></strong></div>
          <p class="d-small">Materiales y mano de obra. El valor final se confirma en la visita.</p>
          <button type="button" class="d-cta" data-visita>Agendar visita a terreno</button><p class="d-ok" role="status"></p></section>`;
      const upd = () => { $("[data-tot]", root).textContent = clp(m2 * tipos[tipo][1]); $("[data-m2]", root).textContent = m2; };
      upd();
      $("#d-m2", root).addEventListener("input", e => { m2 = +e.target.value; upd(); });
      root.addEventListener("click", e => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.dataset.tipo) { tipo = +b.dataset.tipo; $$("[data-tipo]", root).forEach(x => x.setAttribute("aria-pressed", x === b)); upd(); }
        else if ("visita" in b.dataset) { $(".d-ok", root).textContent = `Pedido de visita enviado: ${tipos[tipo][0].toLowerCase()}, ${m2} m². Te llamamos para coordinar el día.`; track("demo_interaccion", { rubro: "construccion" }); }
      });
    }
  };

  /* ---------- la página ---------- */
  const tabs = $(".ex-tabs"), screen = $(".phone-screen"), url = $("#phone-url");
  const info = { h: $("#ex-h"), lead: $("#ex-lead"), list: $("#ex-list"), cot: $("#ex-cot"), wa: $("#ex-wa") };
  if (!tabs || !screen) return;
  const ids = Object.keys(RUBROS);
  tabs.innerHTML = ids.map(id => `<button type="button" role="tab" id="tab-${id}" aria-controls="ex-panel" aria-selected="false" tabindex="-1" data-r="${id}">${RUBROS[id].tab}</button>`).join("");

  const show = (id, focus) => {
    const r = RUBROS[id] || RUBROS.restaurante; id = RUBROS[id] ? id : "restaurante";
    $$("[role=tab]", tabs).forEach(t => { const on = t.dataset.r === id; t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    $("#ex-panel").setAttribute("aria-labelledby", "tab-" + id);
    info.h.textContent = r.titulo;
    info.lead.textContent = r.lead;
    info.list.innerHTML = r.incluye.map(x => `<li>${esc(x)}</li>`).join("");
    info.cot.href = `/contacto/?rubro=${id}&servicio=${r.servicio}`;
    info.wa.href = waLink(`Hola {found}, vi el ejemplo de ${r.tab.toLowerCase()} en su página y quiero uno así para mi negocio.`);
    info.wa.dataset.where = "ejemplo-" + id;
    url.textContent = r.url;
    const fresh = current.cloneNode(false); current.replaceWith(fresh); // sin oyentes viejos
    fresh.dataset.r = id; fresh.setAttribute("aria-label", `Ejemplo ficticio: ${r.tab.toLowerCase()}`);
    current = fresh; DEMOS[id](fresh); fresh.scrollTop = 0;
    const u = new URL(location.href); u.searchParams.set("rubro", id); history.replaceState(null, "", u);
  };
  let current = screen;
  tabs.addEventListener("click", e => { const b = e.target.closest("[role=tab]"); if (b) { show(b.dataset.r); track("demo_rubro", { rubro: b.dataset.r }); } });
  tabs.addEventListener("keydown", e => {
    const list = $$("[role=tab]", tabs), i = list.findIndex(t => t.getAttribute("aria-selected") === "true");
    let j = null;
    if (e.key === "ArrowRight") j = (i + 1) % list.length;
    if (e.key === "ArrowLeft") j = (i - 1 + list.length) % list.length;
    if (e.key === "Home") j = 0;
    if (e.key === "End") j = list.length - 1;
    if (j !== null) { e.preventDefault(); show(list[j].dataset.r, true); }
  });
  show(new URLSearchParams(location.search).get("rubro") || "restaurante");
})();
