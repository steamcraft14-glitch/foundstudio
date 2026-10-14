/* {found} studio · /panel/
   Panel de administración: proyectos (estado, brief, archivos), cotizaciones, estimados del asistente y visitas.
   Todo pasa por la sesión del administrador: la base de datos (RLS) es la que decide qué se puede ver y cambiar. */
(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const mostrar = id => ["#a-cargando", "#a-off", "#a-entrada", "#a-noadmin", "#a-app"].forEach(s => { $(s).hidden = s !== id; });
  const NOMBRE_ESTADO = Object.fromEntries(ESTADOS);
  const SERVICIOS = { pagina: "Página web", tienda: "Tienda online", software: "Sistema", varios: "Varios" };
  const COT = { nueva: "Nueva", propuesta: "Propuesta enviada", aceptada: "Aceptada", descartada: "Descartada" };
  const clp = n => "$" + Math.round(n || 0).toLocaleString("es-CL");
  const wa = tel => { let d = String(tel || "").replace(/\D/g, ""); if (d.length === 9 && d[0] === "9") d = "56" + d; return d.length >= 8 ? `https://wa.me/${d}` : null; };
  let db, proyectos = [], cotizaciones = [], filtroP = "activos", filtroC = "abiertas";

  async function iniciar() {
    if (!sesion.activo()) return mostrar("#a-off");
    db = sesion.db();
    const user = await sesion.usuario();
    if (!user) { sesion.montarEntrada($("#a-entrada")); return mostrar("#a-entrada"); }
    $("#a-quien").textContent = user.email;
    $("#a-salir").hidden = false;
    $("#a-salir").addEventListener("click", () => sesion.salir());
    const { data: esAdmin } = await db.rpc("soy_admin");
    if (esAdmin !== true) return mostrar("#a-noadmin");
    mostrar("#a-app");
    pestañas();
    await Promise.all([cargarProyectos(), cargarCotizaciones()]);
    const m = location.hash.match(/p=([0-9a-f-]{36})/);
    if (m) abrirProyecto(m[1]);
  }

  /* ---------- pestañas (flechas para moverse, como en /ejemplos/) ---------- */
  function pestañas() {
    const tabs = [...document.querySelectorAll("[role=tab]")];
    const cargado = {};
    const ir = t => {
      tabs.forEach(x => { const on = x === t; x.setAttribute("aria-selected", on); x.tabIndex = on ? 0 : -1; $("#" + x.getAttribute("aria-controls")).hidden = !on; });
      const id = t.id.slice(2);
      if (!cargado[id]) { cargado[id] = true; if (id === "estimados") cargarEstimados(); if (id === "visitas") cargarVisitas(); }
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => ir(t));
      t.addEventListener("keydown", e => {
        const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d) return;
        const n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); ir(n);
      });
    });
  }

  const filtro = (cont, opciones, actual, alElegir) => {
    cont.replaceChildren(...opciones.map(([k, txt]) => el("button", { type: "button", class: "chip-f", "aria-pressed": String(k === actual), onclick: () => alElegir(k) }, txt)));
  };

  /* ---------- proyectos ---------- */
  async function cargarProyectos() {
    const { data, error } = await db.from("proyectos").select("*, briefs(enviado_at, actualizado_at)").order("actualizado_at", { ascending: false });
    if (error) { $("#l-proyectos").replaceChildren(el("li", { class: "soft" }, "No se pudieron cargar los proyectos: " + error.message)); return; }
    proyectos = data.map(p => ({ ...p, brief: Array.isArray(p.briefs) ? p.briefs[0] : p.briefs }));
    pintarProyectos();
  }

  function pintarProyectos() {
    const activos = proyectos.filter(p => p.estado !== "publicado");
    $("#n-proyectos").textContent = activos.length || "";
    filtro($("#f-estado"), [["activos", `En curso (${activos.length})`], ["publicado", "Publicados"], ["todos", "Todos"]], filtroP, k => { filtroP = k; pintarProyectos(); });
    const lista = proyectos.filter(p => filtroP === "todos" || (filtroP === "activos" ? p.estado !== "publicado" : p.estado === filtroP));
    $("#l-proyectos").replaceChildren(...(lista.length ? lista.map(p => el("li", {},
      el("button", { type: "button", class: "item", "data-id": p.id, onclick: () => abrirProyecto(p.id) },
        el("span", { class: "item-tit" }, p.negocio),
        el("span", { class: "item-sub" }, `${p.cliente_nombre} · ${SERVICIOS[p.servicio] || p.servicio}`),
        el("span", { class: `badge e-${p.estado}` }, NOMBRE_ESTADO[p.estado]),
        p.brief?.enviado_at ? el("span", { class: "badge ok" }, "Brief recibido") : p.estado === "brief" ? el("span", { class: "badge" }, "Brief pendiente") : null)))
      : [el("li", { class: "vacio soft" }, filtroP === "activos" ? "No hay proyectos en curso. Cuando una cotización se acepte, créalo desde «Cotizaciones»." : "Nada por aquí.")]));
  }

  async function abrirProyecto(id) {
    const p = proyectos.find(x => x.id === id);
    const d = $("#d-proyecto");
    if (!p) { d.replaceChildren(el("p", { class: "soft" }, "No encontramos ese proyecto.")); return; }
    history.replaceState(null, "", "#p=" + id);
    document.querySelectorAll("#l-proyectos .item").forEach(b => b.classList.toggle("is-on", b.dataset.id === id));
    d.replaceChildren(el("p", { class: "soft" }, "Cargando…"));
    const [{ data: b }, { data: files }] = await Promise.all([
      db.from("briefs").select("*").eq("proyecto_id", id).maybeSingle(),
      db.storage.from("archivos").list(id, { limit: 200, sortBy: { column: "created_at", order: "desc" } })
    ]);

    // estado
    const sel = el("select", { id: "d-estado" }, ESTADOS.map(([k, t]) => el("option", { value: k, selected: k === p.estado }, t)));
    const url = el("input", { id: "d-url", type: "text", inputmode: "url", maxlength: "300", placeholder: "https://tunegocio.cl", value: p.url_publicada || "" });
    const avisar = el("input", { id: "d-avisar", type: "checkbox", checked: true });
    const st = el("p", { class: "status", role: "status", "aria-live": "polite" });
    const guardar = el("button", { class: "btn btn-sm", type: "button", onclick: async () => {
      guardar.disabled = true; st.removeAttribute("data-kind"); st.textContent = "Guardando…";
      try {
        await sesion.funcion("estado", { proyecto_id: id, estado: sel.value, url_publicada: url.value, avisar: avisar.checked });
        st.dataset.kind = "ok"; st.textContent = avisar.checked ? "Estado guardado y cliente avisado por correo." : "Estado guardado.";
        await cargarProyectos();
      } catch (e) { st.dataset.kind = "error"; st.textContent = e.message; }
      guardar.disabled = false;
    } }, "Guardar estado");

    const reenviar = el("button", { class: "btn btn-sm btn-ghost", type: "button", onclick: async () => {
      reenviar.disabled = true; st.removeAttribute("data-kind"); st.textContent = "Enviando enlace…";
      try { await sesion.funcion("enlace", { proyecto_id: id }); st.dataset.kind = "ok"; st.textContent = `Enlace de acceso enviado a ${p.cliente_email}.`; }
      catch (e) { st.dataset.kind = "error"; st.textContent = e.message; }
      reenviar.disabled = false;
    } }, "Reenviar acceso");

    const waUrl = wa(p.cliente_telefono || b?.respuestas?.WhatsApp);
    const cabeza = el("div", { class: "d-head" },
      el("h2", {}, p.negocio),
      el("p", { class: "soft" }, `${p.cliente_nombre} · `, el("a", { href: `mailto:${p.cliente_email}` }, p.cliente_email), ` · ${SERVICIOS[p.servicio] || p.servicio} · desde ${fecha(p.created_at)}`),
      el("div", { class: "btns" },
        waUrl ? el("a", { class: "btn btn-sm", href: waUrl + "?text=" + encodeURIComponent(`Hola ${p.cliente_nombre.split(" ")[0]}, te escribo de {found} studio por ${p.negocio}.`), target: "_blank", rel: "noopener" }, "WhatsApp") : null,
        reenviar));

    const estado = el("div", { class: "d-bloque" }, el("h3", {}, "Estado"),
      el("div", { class: "row-2" },
        el("div", { class: "field" }, el("label", { for: "d-estado" }, "Etapa"), sel),
        el("div", { class: "field" }, el("label", { for: "d-url" }, "Dirección publicada ", el("small", {}, "(al publicar)")), url)),
      el("label", { class: "consent", for: "d-avisar" }, avisar, el("span", {}, "Avisar al cliente por correo")),
      guardar, st);

    // brief
    const r = b?.respuestas || {};
    const filas = Object.entries(r).filter(([, v]) => String(v ?? "").trim());
    const reabrir = b?.enviado_at ? el("button", { class: "btn btn-sm btn-ghost", type: "button", onclick: async () => {
      if (!confirm("¿Reabrir el brief para que el cliente lo pueda editar?")) return;
      const { error } = await db.from("briefs").update({ enviado_at: null }).eq("proyecto_id", id);
      if (!error) { await cargarProyectos(); abrirProyecto(id); }
    } }, "Reabrir para el cliente") : null;
    const copiar = filas.length ? el("button", { class: "btn btn-sm btn-ghost", type: "button", onclick: async e => {
      try { await navigator.clipboard.writeText(`Brief de ${p.negocio}\n\n` + filas.map(([k, v]) => `${k}: ${[].concat(v).join(", ")}`).join("\n")); e.target.textContent = "Copiado"; }
      catch (_) { e.target.textContent = "No se pudo copiar"; }
    } }, "Copiar texto") : null;
    const brief = el("div", { class: "d-bloque" },
      el("div", { class: "card-head" }, el("h3", {}, "Brief"),
        el("span", { class: b?.enviado_at ? "badge ok" : "badge" }, b?.enviado_at ? `Enviado ${fecha(b.enviado_at, true)}` : b?.actualizado_at ? `Borrador · ${fecha(b.actualizado_at, true)}` : "Sin empezar")),
      filas.length ? el("dl", { class: "respuestas" }, filas.map(([k, v]) => el("div", {}, el("dt", {}, k), el("dd", {}, [].concat(v).join(", ")))))
        : el("p", { class: "soft" }, "El cliente aún no escribe nada."),
      el("div", { class: "btns" }, copiar, reabrir));

    // archivos
    const reales = (files || []).filter(f => f.id);
    const { data: urls } = reales.length ? await db.storage.from("archivos").createSignedUrls(reales.map(f => `${id}/${f.name}`), 3600, { download: true }) : { data: [] };
    const arch = el("div", { class: "d-bloque" }, el("h3", {}, `Archivos (${reales.length})`),
      reales.length ? el("ul", { class: "archivos" }, reales.map(f => {
        const u = (urls || []).find(x => x.path === `${id}/${f.name}`)?.signedUrl;
        return el("li", {}, el("span", { class: "tipo", "aria-hidden": "true" }, (f.name.split(".").pop() || "").slice(0, 4).toUpperCase()),
          el("span", { class: "nombre" }, f.name.replace(/^\d+-/, ""), el("small", {}, ` · ${fecha(f.created_at, true)}`)),
          u ? el("a", { class: "btn btn-ghost btn-sm", href: u }, "Descargar") : null);
      })) : el("p", { class: "soft" }, "Todavía no sube archivos."));

    d.replaceChildren(cabeza, estado, brief, arch);
    if (matchMedia("(max-width: 900px)").matches) d.scrollIntoView({ block: "start" });
  }

  /* ---------- cotizaciones ---------- */
  async function cargarCotizaciones() {
    const { data, error } = await db.from("cotizaciones").select("*").order("created_at", { ascending: false }).limit(300);
    if (error) { $("#l-cotizaciones").replaceChildren(el("li", { class: "soft" }, "No se pudieron cargar: " + error.message)); return; }
    cotizaciones = data;
    pintarCotizaciones();
  }

  function pintarCotizaciones() {
    const abiertas = cotizaciones.filter(c => c.estado === "nueva" || c.estado === "propuesta");
    $("#n-cotizaciones").textContent = cotizaciones.filter(c => c.estado === "nueva").length || "";
    filtro($("#f-cot"), [["abiertas", `Abiertas (${abiertas.length})`], ["aceptada", "Aceptadas"], ["descartada", "Descartadas"], ["todas", "Todas"]], filtroC, k => { filtroC = k; pintarCotizaciones(); });
    const lista = cotizaciones.filter(c => filtroC === "todas" || (filtroC === "abiertas" ? abiertas.includes(c) : c.estado === filtroC));
    $("#l-cotizaciones").replaceChildren(...(lista.length ? lista.map(tarjetaCot) : [el("li", { class: "vacio soft" }, "Sin cotizaciones aquí.")]));
  }

  const ORIGEN = { formulario: "Formulario", asistente: "Asistente", whatsapp: "WhatsApp", manual: "Manual" };
  function tarjetaCot(c) {
    const st = el("p", { class: "status", role: "status", "aria-live": "polite" });
    const cambiar = async estado => {
      const { error } = await db.from("cotizaciones").update({ estado }).eq("id", c.id);
      if (error) { st.dataset.kind = "error"; st.textContent = error.message; return; }
      c.estado = estado; pintarCotizaciones();
    };
    const waUrl = wa(c.telefono);
    const li = el("li", { class: "card cot" },
      el("div", { class: "cot-head" },
        el("div", {}, el("h3", {}, c.negocio), el("p", { class: "soft" }, `${c.nombre} · ${fecha(c.created_at, true)} · ${ORIGEN[c.origen] || c.origen}`)),
        el("span", { class: `badge c-${c.estado}` }, COT[c.estado])),
      el("dl", { class: "cot-datos" },
        c.servicio ? el("div", {}, el("dt", {}, "Necesita"), el("dd", {}, c.servicio)) : null,
        c.rubro ? el("div", {}, el("dt", {}, "Rubro"), el("dd", {}, c.rubro)) : null,
        c.telefono ? el("div", {}, el("dt", {}, "WhatsApp"), el("dd", {}, c.telefono)) : null,
        c.email ? el("div", {}, el("dt", {}, "Correo"), el("dd", {}, el("a", { href: `mailto:${c.email}` }, c.email))) : null),
      c.mensaje ? el("p", { class: "cot-msg" }, c.mensaje) : null,
      el("div", { class: "btns" },
        c.estado !== "aceptada" ? el("button", { class: "btn btn-sm", type: "button", onclick: () => li.querySelector(".aceptar").hidden = false }, "Aceptada") : null,
        c.estado === "nueva" ? el("button", { class: "btn btn-sm btn-ghost", type: "button", onclick: () => cambiar("propuesta") }, "Propuesta enviada") : null,
        c.estado !== "descartada" && c.estado !== "aceptada" ? el("button", { class: "btn btn-sm btn-ghost", type: "button", onclick: () => cambiar("descartada") }, "Descartar") : null,
        waUrl ? el("a", { class: "btn btn-sm btn-ghost", href: waUrl + "?text=" + encodeURIComponent(`Hola ${c.nombre.split(" ")[0]}, te escribo de {found} studio por tu cotización.`), target: "_blank", rel: "noopener" }, "WhatsApp") : null),
      formAceptar(c), st);
    return li;
  }

  /* «Aceptada»: crea el proyecto y al cliente le llega el enlace para entrar */
  function formAceptar(c) {
    const uid = "a" + c.id;
    const servicio = /tienda/i.test(c.servicio || "") ? "tienda" : /sistema|software|inventario/i.test(c.servicio || "") ? "software" : "pagina";
    const st = el("p", { class: "status", role: "status", "aria-live": "polite" });
    const f = el("form", { class: "aceptar", hidden: true, novalidate: true },
      el("p", { class: "soft" }, "Se crea el proyecto y al cliente le llega un correo con el enlace para entrar (sin contraseña)."),
      el("div", { class: "row-2" },
        el("div", { class: "field" }, el("label", { for: uid + "e" }, "Correo del cliente"), el("input", { id: uid + "e", name: "email", type: "email", maxlength: "120", value: c.email || "", required: true })),
        el("div", { class: "field" }, el("label", { for: uid + "s" }, "Proyecto"), el("select", { id: uid + "s", name: "servicio" }, Object.entries(SERVICIOS).map(([k, t]) => el("option", { value: k, selected: k === servicio }, t))))),
      el("div", { class: "row-2" },
        el("div", { class: "field" }, el("label", { for: uid + "n" }, "Nombre"), el("input", { id: uid + "n", name: "nombre", maxlength: "80", value: c.nombre })),
        el("div", { class: "field" }, el("label", { for: uid + "g" }, "Negocio"), el("input", { id: uid + "g", name: "negocio", maxlength: "80", value: c.negocio }))),
      el("div", { class: "btns" }, el("button", { class: "btn btn-sm", type: "submit" }, "Crear proyecto y enviar acceso"),
        el("button", { class: "btn btn-sm btn-ghost", type: "button", onclick: () => { f.hidden = true; } }, "Cancelar")),
      st);
    f.addEventListener("submit", async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f));
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) { st.dataset.kind = "error"; st.textContent = "Falta el correo del cliente: sin correo no puede entrar al portal."; return; }
      const btn = f.querySelector("[type=submit]"); btn.disabled = true; st.removeAttribute("data-kind"); st.textContent = "Creando…";
      try {
        const r = await sesion.funcion("invitar", { cotizacion_id: c.id, telefono: c.telefono, ...d });
        await Promise.all([cargarCotizaciones(), cargarProyectos()]);
        $("#t-proyectos").click(); abrirProyecto(r.proyecto_id);
      } catch (err) { st.dataset.kind = "error"; st.textContent = err.message; btn.disabled = false; }
    });
    return f;
  }

  $("#c-nueva").addEventListener("click", () => { $("#c-form").hidden = false; $("#c-nombre").focus(); });
  $("#c-cancelar").addEventListener("click", () => { $("#c-form").hidden = true; });
  $("#c-form").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target, st = f.querySelector(".status"), d = Object.fromEntries(new FormData(f));
    if (!d.nombre.trim() || !d.negocio.trim()) { st.dataset.kind = "error"; st.textContent = "Faltan el nombre y el negocio."; return; }
    const fila = Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.trim() || null]));
    const { error } = await db.from("cotizaciones").insert({ ...fila, estado: "nueva" });
    if (error) { st.dataset.kind = "error"; st.textContent = error.message; return; }
    f.reset(); f.hidden = true; st.textContent = "";
    await cargarCotizaciones();
  });

  /* ---------- estimados del asistente ---------- */
  async function cargarEstimados() {
    const { data, error } = await db.from("estimados").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) { $("#e-filas").replaceChildren(el("tr", {}, el("td", { colspan: 5 }, error.message))); return; }
    const mes = data.filter(x => Date.now() - new Date(x.created_at) < 30 * 864e5);
    const cuenta = k => mes.filter(x => x.servicio === k).length;
    const prom = mes.length ? mes.reduce((a, x) => a + (x.rango_min + x.rango_max) / 2, 0) / mes.length : 0;
    $("#e-kpis").replaceChildren(
      el("div", { class: "kpi" }, el("b", {}, mes.length), el("span", {}, "estimados en 30 días")),
      el("div", { class: "kpi" }, el("b", {}, cuenta("pagina")), el("span", {}, "páginas web")),
      el("div", { class: "kpi" }, el("b", {}, cuenta("tienda")), el("span", {}, "tiendas online")),
      el("div", { class: "kpi" }, el("b", {}, cuenta("sistema")), el("span", {}, "sistemas")),
      el("div", { class: "kpi" }, el("b", {}, mes.length ? clp(prom) : "—"), el("span", {}, "punto medio promedio")));
    $("#e-filas").replaceChildren(...(data.length ? data.map(x => el("tr", {},
      el("td", {}, fecha(x.created_at, true)), el("td", {}, SERVICIOS[x.servicio] || (x.servicio === "sistema" ? "Sistema" : x.servicio)), el("td", {}, x.rubro || "—"),
      el("td", { class: "num" }, `${clp(x.rango_min)} a ${clp(x.rango_max)}`), el("td", { class: "soft" }, (x.detalle?.incluye || []).join(", "))))
      : [el("tr", {}, el("td", { colspan: 5, class: "soft" }, "Todavía nadie ha calculado un estimado."))]));
  }

  /* ---------- visitas (GoatCounter, a través de la función del servidor) ---------- */
  async function cargarVisitas() {
    const c = $("#vi-cont");
    try {
      const v = await sesion.funcion("visitas");
      if (!v.configurado) { c.replaceChildren(el("p", { class: "soft" }, "Para ver las visitas aquí, agrega el secreto GOATCOUNTER_TOKEN a la función (paso 6 de docs/PORTAL.md). Mientras, míralas en GoatCounter.")); return; }
      const paginas = v.paginas.filter(p => !p.evento), eventos = v.paginas.filter(p => p.evento);
      const tabla = (tit, filas, col) => el("div", { class: "card vi-tabla" }, el("h3", {}, tit),
        filas.length ? el("ol", {}, filas.slice(0, 15).map(f => el("li", {}, el("span", {}, f[col]), el("b", {}, f.visitas)))) : el("p", { class: "soft" }, "Sin datos aún."));
      c.replaceChildren(
        el("div", { class: "kpis" },
          el("div", { class: "kpi" }, el("b", {}, v.total.toLocaleString("es-CL")), el("span", {}, "visitas en 30 días")),
          el("div", { class: "kpi" }, el("b", {}, v.eventos.toLocaleString("es-CL")), el("span", {}, "acciones (clics, envíos)"))),
        el("div", { class: "vi-grid" },
          tabla("De dónde llegan", v.origenes, "nombre"),
          tabla("Páginas más vistas", paginas, "ruta"),
          tabla("Acciones", eventos.map(e => ({ ...e, ruta: e.ruta.replace(/^evento\//, "") })), "ruta")));
    } catch (e) { c.replaceChildren(el("p", { class: "status", "data-kind": "error" }, "No se pudieron cargar las visitas: " + e.message)); }
  }

  iniciar().catch(err => { console.warn("[panel]", err); $("#a-cargando").hidden = false; $("#a-cargando").textContent = "Algo falló al cargar. Recarga la página."; });
})();
