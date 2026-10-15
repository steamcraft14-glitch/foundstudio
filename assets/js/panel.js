/* {found} studio · /panel/
   Panel de administración: resumen, proyectos (estado, datos, brief, archivos, historial), cotizaciones, estimados del asistente y visitas.
   Todo pasa por la sesión del administrador: la base de datos (RLS) es la que decide qué se puede ver, cambiar y borrar. */
(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const mostrar = id => ["#a-cargando", "#a-off", "#a-entrada", "#a-noadmin", "#a-app"].forEach(s => { $(s).hidden = s !== id; });
  const NOMBRE_ESTADO = Object.fromEntries(ESTADOS);
  const SERVICIOS = { pagina: "Página web", tienda: "Tienda online", software: "Sistema", varios: "Varios" };
  const COT = { nueva: "Nueva", propuesta: "Propuesta enviada", aceptada: "Aceptada", descartada: "Descartada" };
  const ORIGEN = { formulario: "Formulario", asistente: "Asistente", whatsapp: "WhatsApp", manual: "Manual" };
  const clp = n => "$" + Math.round(n || 0).toLocaleString("es-CL");
  const wa = tel => { let d = String(tel || "").replace(/\D/g, ""); if (d.length === 9 && d[0] === "9") d = "56" + d; return d.length >= 8 ? `https://wa.me/${d}` : null; };
  const norm = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const coincide = (texto, ...campos) => !texto || campos.some(c => norm(c).includes(texto));
  const DIA = 864e5;
  let db, proyectos = [], cotizaciones = [], estimados = [], formularios = [], filtroF = "nuevo";
  let filtroP = "activos", filtroC = "abiertas", buscaP = "", buscaC = "";
  const elegidas = new Set();   // cotizaciones marcadas para acciones en grupo

  async function iniciar() {
    if (!sesion.activo()) return mostrar("#a-off");
    db = sesion.db();
    const user = await sesion.usuario();
    if (!user) { sesion.montarEntrada($("#a-entrada")); return mostrar("#a-entrada"); }
    $("#a-quien").textContent = user.email;
    $("#a-salir").hidden = false;
    $("#a-salir").addEventListener("click", () => sesion.salir());
    $("#a-clave-user").value = user.email;
    sesion.montarClave($("#a-clave-form"));
    const { data: esAdmin } = await db.rpc("soy_admin");
    if (esAdmin !== true) return mostrar("#a-noadmin");
    mostrar("#a-app");
    pestañas();
    await Promise.all([cargarProyectos(), cargarCotizaciones(), cargarFormularios()]);
    const m = location.hash.match(/p=([0-9a-f-]{36})/);
    if (m) abrirProyecto(m[1]);
  }

  /* ---------- utilidades de interfaz ---------- */
  // confirmación con <dialog> propio (sin confirm() del navegador)
  function confirmar({ titulo, texto, boton = "Eliminar" }) {
    const d = $("#a-confirmar");
    d.querySelector("h2").textContent = titulo;
    d.querySelector("p").textContent = texto;
    d.querySelector("[value=si]").textContent = boton;
    d.returnValue = "";
    d.showModal();
    d.querySelector("[value=no]").focus();
    return new Promise(res => d.addEventListener("close", () => res(d.returnValue === "si"), { once: true }));
  }

  // aviso breve abajo de la pantalla
  let avisoT;
  function avisar(texto, kind = "ok") {
    const a = $("#a-aviso");
    a.textContent = texto; a.dataset.kind = kind; a.hidden = false;
    clearTimeout(avisoT); avisoT = setTimeout(() => { a.hidden = true; }, 4500);
  }

  // descarga una tabla como CSV (separado por «;» para que Excel en español lo abra en columnas)
  function descargarCSV(nombre, filas) {
    if (!filas.length) return avisar("No hay filas para exportar.", "error");
    const cols = Object.keys(filas[0]);
    const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const txt = "﻿" + [cols.map(esc).join(";"), ...filas.map(f => cols.map(c => esc(f[c])).join(";"))].join("\r\n");
    const url = URL.createObjectURL(new Blob([txt], { type: "text/csv;charset=utf-8" }));
    const a = el("a", { href: url, download: `${new Date().toISOString().slice(0, 10)}_${nombre}.csv` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const estado = (st, kind, texto) => { if (kind) st.dataset.kind = kind; else st.removeAttribute("data-kind"); st.textContent = texto; };

  /* ---------- pestañas (flechas para moverse, como en /ejemplos/) ---------- */
  let irA;
  function pestañas() {
    const tabs = [...document.querySelectorAll("[role=tab]")];
    const cargado = {};
    irA = t => {
      tabs.forEach(x => { const on = x === t; x.setAttribute("aria-selected", on); x.tabIndex = on ? 0 : -1; $("#" + x.getAttribute("aria-controls")).hidden = !on; });
      const id = t.id.slice(2);
      if (!cargado[id]) { cargado[id] = true; if (id === "estimados") cargarEstimados(); if (id === "visitas") cargarVisitas(); }
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => irA(t));
      t.addEventListener("keydown", e => {
        const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d) return;
        const n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); irA(n);
      });
    });
  }

  const filtro = (cont, opciones, actual, alElegir) => {
    cont.replaceChildren(...opciones.map(([k, txt]) => el("button", { type: "button", class: "chip-f", "aria-pressed": String(k === actual), onclick: () => alElegir(k) }, txt)));
  };

  /* ---------- resumen (arriba de las pestañas) ---------- */
  function pintarResumen() {
    const nuevas = cotizaciones.filter(c => c.estado === "nueva");
    const atrasadas = nuevas.filter(c => Date.now() - new Date(c.created_at) > DIA);
    const propuestas = cotizaciones.filter(c => c.estado === "propuesta");
    const enCurso = proyectos.filter(p => p.estado !== "publicado");
    const porRevisar = proyectos.filter(p => p.brief?.enviado_at && (p.estado === "aceptada" || p.estado === "brief"));
    const cerradas = cotizaciones.filter(c => c.estado === "aceptada" || c.estado === "descartada");
    const tasa = cerradas.length ? Math.round(100 * cerradas.filter(c => c.estado === "aceptada").length / cerradas.length) + "%" : "—";
    const kpi = (n, txt, alClic, alerta) => el("button", { type: "button", class: "kpi kpi-btn" + (alerta ? " is-alerta" : ""), onclick: alClic }, el("b", {}, n), el("span", {}, txt));
    const aCot = f => () => { filtroC = f; pintarCotizaciones(); irA($("#t-cotizaciones")); };
    const aPro = f => () => { filtroP = f; pintarProyectos(); irA($("#t-proyectos")); };
    $("#a-resumen").replaceChildren(
      kpi(nuevas.length, atrasadas.length ? `cotizaciones nuevas · ${atrasadas.length} con más de 24 h` : "cotizaciones nuevas", aCot("nueva"), atrasadas.length > 0),
      kpi(propuestas.length, "propuestas esperando respuesta", aCot("propuesta")),
      kpi(enCurso.length, "proyectos en curso", aPro("activos")),
      kpi(porRevisar.length, "briefs recibidos por revisar", aPro("revisar"), porRevisar.length > 0),
      kpi(tasa, "cotizaciones cerradas que se aceptan", aCot("todas")));
  }

  /* ---------- proyectos ---------- */
  async function cargarProyectos() {
    const { data, error } = await db.from("proyectos").select("*, briefs(enviado_at, actualizado_at)").order("actualizado_at", { ascending: false });
    if (error) { $("#l-proyectos").replaceChildren(el("li", { class: "soft" }, "No se pudieron cargar los proyectos: " + error.message)); return; }
    proyectos = data.map(p => ({ ...p, brief: Array.isArray(p.briefs) ? p.briefs[0] : p.briefs }));
    pintarProyectos();
  }

  const porRevisar = p => p.brief?.enviado_at && (p.estado === "aceptada" || p.estado === "brief");
  function pintarProyectos() {
    const activos = proyectos.filter(p => p.estado !== "publicado");
    const revisar = proyectos.filter(porRevisar);
    $("#n-proyectos").textContent = activos.length || "";
    filtro($("#f-estado"), [["activos", `En curso (${activos.length})`], ["revisar", `Brief por revisar (${revisar.length})`], ["publicado", "Publicados"], ["todos", "Todos"]], filtroP, k => { filtroP = k; pintarProyectos(); });
    const lista = proyectos.filter(p =>
      (filtroP === "todos" || (filtroP === "activos" ? p.estado !== "publicado" : filtroP === "revisar" ? porRevisar(p) : p.estado === filtroP)) &&
      coincide(buscaP, p.negocio, p.cliente_nombre, p.cliente_email, p.cliente_telefono));
    const actual = location.hash.match(/p=([0-9a-f-]{36})/)?.[1];
    $("#l-proyectos").replaceChildren(...(lista.length ? lista.map(p => el("li", {},
      el("button", { type: "button", class: "item" + (p.id === actual ? " is-on" : ""), "data-id": p.id, onclick: () => abrirProyecto(p.id) },
        el("span", { class: "item-tit" }, p.negocio),
        el("span", { class: "item-sub" }, `${p.cliente_nombre} · ${SERVICIOS[p.servicio] || p.servicio}`),
        el("span", { class: `badge e-${p.estado}` }, NOMBRE_ESTADO[p.estado]),
        p.brief?.enviado_at ? el("span", { class: "badge ok" }, "Brief recibido") : p.estado === "brief" ? el("span", { class: "badge" }, "Brief pendiente") : null)))
      : [el("li", { class: "vacio soft" }, buscaP ? "Ningún proyecto coincide con la búsqueda." : filtroP === "activos" ? "No hay proyectos en curso. Cuando una cotización se acepte, créalo desde «Cotizaciones»." : "Nada por aquí.")]));
    pintarResumen();
  }

  function vacíoDetalle(texto = "Elige un proyecto para ver su brief, sus archivos y cambiar el estado.") {
    $("#d-proyecto").replaceChildren(el("p", { class: "soft" }, texto));
  }

  async function abrirProyecto(id) {
    const p = proyectos.find(x => x.id === id);
    const d = $("#d-proyecto");
    if (!p) { vacíoDetalle("No encontramos ese proyecto."); return; }
    history.replaceState(null, "", "#p=" + id);
    document.querySelectorAll("#l-proyectos .item").forEach(b => b.classList.toggle("is-on", b.dataset.id === id));
    d.replaceChildren(el("p", { class: "soft" }, "Cargando…"));
    const [{ data: b }, { data: files }, { data: hist }] = await Promise.all([
      db.from("briefs").select("*").eq("proyecto_id", id).maybeSingle(),
      db.storage.from("archivos").list(id, { limit: 200, sortBy: { column: "created_at", order: "desc" } }),
      db.from("historial").select("estado, created_at").eq("proyecto_id", id).order("created_at", { ascending: true })
    ]);

    // estado
    const sel = el("select", { id: "d-estado" }, ESTADOS.map(([k, t]) => el("option", { value: k, selected: k === p.estado }, t)));
    const url = el("input", { id: "d-url", type: "text", inputmode: "url", maxlength: "300", placeholder: "https://tunegocio.cl", value: p.url_publicada || "" });
    const avisarCliente = el("input", { id: "d-avisar", type: "checkbox", checked: true });
    const st = el("p", { class: "status", role: "status", "aria-live": "polite" });
    const guardar = el("button", { class: "btn btn-sm", type: "button", onclick: async () => {
      guardar.disabled = true; estado(st, null, "Guardando…");
      try {
        await sesion.funcion("estado", { proyecto_id: id, estado: sel.value, url_publicada: url.value, avisar: avisarCliente.checked });
        estado(st, "ok", avisarCliente.checked ? "Estado guardado y cliente avisado por correo." : "Estado guardado.");
        await cargarProyectos();
      } catch (e) { estado(st, "error", e.message); }
      guardar.disabled = false;
    } }, "Guardar estado");

    const reenviar = el("button", { class: "btn btn-sm btn-ghost", type: "button", onclick: async () => {
      reenviar.disabled = true; estado(st, null, "Enviando enlace…");
      try { await sesion.funcion("enlace", { proyecto_id: id }); estado(st, "ok", `Enlace de acceso enviado a ${p.cliente_email}.`); }
      catch (e) { estado(st, "error", e.message); }
      reenviar.disabled = false;
    } }, "Reenviar acceso");

    const copiarPortal = el("button", { class: "btn btn-sm btn-ghost", type: "button", onclick: async () => {
      try { await navigator.clipboard.writeText(`${location.origin}/mi-proyecto/?email=${encodeURIComponent(p.cliente_email)}`); avisar("Enlace al portal copiado. El cliente pide ahí su acceso con su correo."); }
      catch (_) { avisar("No se pudo copiar.", "error"); }
    } }, "Copiar enlace al portal");

    const waUrl = wa(p.cliente_telefono || b?.respuestas?.WhatsApp);
    const cabeza = el("div", { class: "d-head" },
      el("h2", {}, p.negocio),
      el("p", { class: "soft" }, `${p.cliente_nombre} · `, el("a", { href: `mailto:${p.cliente_email}` }, p.cliente_email), ` · ${SERVICIOS[p.servicio] || p.servicio} · desde ${fecha(p.created_at)}`),
      el("div", { class: "btns" },
        waUrl ? el("a", { class: "btn btn-sm", href: waUrl + "?text=" + encodeURIComponent(`Hola ${p.cliente_nombre.split(" ")[0]}, te escribo de {found} studio por ${p.negocio}.`), target: "_blank", rel: "noopener" }, "WhatsApp") : null,
        reenviar, copiarPortal));

    const bloqueEstado = el("div", { class: "d-bloque" }, el("h3", {}, "Estado"),
      el("div", { class: "row-2" },
        el("div", { class: "field" }, el("label", { for: "d-estado" }, "Etapa"), sel),
        el("div", { class: "field" }, el("label", { for: "d-url" }, "Dirección publicada ", el("small", {}, "(al publicar)")), url)),
      el("label", { class: "consent", for: "d-avisar" }, avisarCliente, el("span", {}, "Avisar al cliente por correo")),
      guardar, st);

    // historial de etapas (lo escribe un trigger en la base de datos)
    const historial = (hist || []).length ? el("div", { class: "d-bloque" }, el("h3", {}, "Historial"),
      el("ol", { class: "historial" }, hist.map(h => el("li", {}, el("span", {}, NOMBRE_ESTADO[h.estado] || h.estado), el("time", { datetime: h.created_at }, fecha(h.created_at, true))))))
      : null;

    // datos del cliente (el correo no se cambia aquí: es la cuenta con la que entra al portal)
    const uid = "dd" + id.slice(0, 8);
    const fDatos = el("form", { class: "d-datos", novalidate: true },
      el("div", { class: "row-2" },
        el("div", { class: "field" }, el("label", { for: uid + "n" }, "Nombre del cliente"), el("input", { id: uid + "n", name: "cliente_nombre", maxlength: "80", required: true, value: p.cliente_nombre })),
        el("div", { class: "field" }, el("label", { for: uid + "g" }, "Negocio"), el("input", { id: uid + "g", name: "negocio", maxlength: "80", required: true, value: p.negocio }))),
      el("div", { class: "row-2" },
        el("div", { class: "field" }, el("label", { for: uid + "t" }, "WhatsApp"), el("input", { id: uid + "t", name: "cliente_telefono", type: "tel", maxlength: "30", value: p.cliente_telefono || "" })),
        el("div", { class: "field" }, el("label", { for: uid + "s" }, "Proyecto"), el("select", { id: uid + "s", name: "servicio" }, Object.entries(SERVICIOS).map(([k, t]) => el("option", { value: k, selected: k === p.servicio }, t))))),
      el("p", { class: "soft d-nota" }, `Correo de acceso: ${p.cliente_email} (no se cambia desde aquí).`),
      el("button", { class: "btn btn-sm btn-ghost", type: "submit" }, "Guardar datos"),
      el("p", { class: "status", role: "status", "aria-live": "polite" }));
    fDatos.addEventListener("submit", async e => {
      e.preventDefault();
      const s = fDatos.querySelector(".status"), v = Object.fromEntries(new FormData(fDatos));
      if (!v.cliente_nombre.trim() || !v.negocio.trim()) return estado(s, "error", "Faltan el nombre y el negocio.");
      const { error } = await db.from("proyectos").update({ cliente_nombre: v.cliente_nombre.trim(), negocio: v.negocio.trim(), cliente_telefono: v.cliente_telefono.trim() || null, servicio: v.servicio }).eq("id", id);
      if (error) return estado(s, "error", error.message);
      avisar("Datos del proyecto guardados.");
      await cargarProyectos(); abrirProyecto(id);
    });
    const datos = el("details", { class: "d-bloque d-plegable" }, el("summary", {}, el("h3", {}, "Datos del cliente")), fDatos);

    // brief
    const r = b?.respuestas || {};
    const filas = Object.entries(r).filter(([, v]) => String(v ?? "").trim());
    const reabrir = b?.enviado_at ? el("button", { class: "btn btn-sm btn-ghost", type: "button", onclick: async () => {
      if (!await confirmar({ titulo: "¿Reabrir el brief?", texto: "El cliente podrá volver a editarlo y enviarlo desde su portal.", boton: "Reabrir" })) return;
      const { error } = await db.from("briefs").update({ enviado_at: null }).eq("proyecto_id", id);
      if (error) return avisar(error.message, "error");
      avisar("Brief reabierto para el cliente.");
      await cargarProyectos(); abrirProyecto(id);
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
        const ruta = `${id}/${f.name}`, nombre = f.name.replace(/^\d+-/, "");
        const u = (urls || []).find(x => x.path === ruta)?.signedUrl;
        return el("li", {}, el("span", { class: "tipo", "aria-hidden": "true" }, (f.name.split(".").pop() || "").slice(0, 4).toUpperCase()),
          el("span", { class: "nombre" }, nombre, el("small", {}, ` · ${fecha(f.created_at, true)}`)),
          el("span", { class: "btns" },
            u ? el("a", { class: "btn btn-ghost btn-sm", href: u }, "Descargar") : null,
            el("button", { class: "btn btn-ghost btn-sm btn-peligro", type: "button", "aria-label": `Eliminar ${nombre}`, onclick: async () => {
              if (!await confirmar({ titulo: "¿Eliminar este archivo?", texto: `«${nombre}» se borra para ti y para el cliente. No se puede deshacer.` })) return;
              const { error } = await db.storage.from("archivos").remove([ruta]);
              if (error) return avisar(error.message, "error");
              avisar("Archivo eliminado."); abrirProyecto(id);
            } }, "Eliminar")));
      })) : el("p", { class: "soft" }, "Todavía no sube archivos."));

    // zona de peligro
    const borrar = el("div", { class: "d-bloque d-peligro" }, el("h3", {}, "Eliminar proyecto"),
      el("p", { class: "soft" }, "Borra el proyecto, su brief, su historial y sus archivos. La cotización de origen se mantiene."),
      el("button", { class: "btn btn-sm btn-peligro", type: "button", onclick: () => eliminarProyecto(p) }, "Eliminar proyecto"));

    d.replaceChildren(cabeza, bloqueEstado, historial, datos, brief, arch, borrar);
    if (matchMedia("(max-width: 900px)").matches) d.scrollIntoView({ block: "start" });
  }

  async function eliminarProyecto(p) {
    if (!await confirmar({ titulo: `¿Eliminar «${p.negocio}»?`, texto: "Se borran el proyecto, su brief, su historial y todos sus archivos. El cliente ya no lo verá en su portal. No se puede deshacer.", boton: "Eliminar proyecto" })) return;
    const { data: files } = await db.storage.from("archivos").list(p.id, { limit: 1000 });
    const rutas = (files || []).filter(f => f.id).map(f => `${p.id}/${f.name}`);
    if (rutas.length) {
      const { error } = await db.storage.from("archivos").remove(rutas);
      if (error) return avisar("No se pudieron borrar los archivos: " + error.message, "error");
    }
    const { data, error } = await db.from("proyectos").delete().eq("id", p.id).select("id");
    if (error || !data?.length) return avisar(error ? error.message : "No se pudo eliminar el proyecto.", "error");
    history.replaceState(null, "", location.pathname);
    vacíoDetalle();
    avisar(`Proyecto «${p.negocio}» eliminado.`);
    await cargarProyectos();
  }

  $("#p-buscar").addEventListener("input", e => { buscaP = norm(e.target.value.trim()); pintarProyectos(); });

  /* ---------- cotizaciones ---------- */
  async function cargarCotizaciones() {
    const { data, error } = await db.from("cotizaciones").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) { $("#l-cotizaciones").replaceChildren(el("li", { class: "soft" }, "No se pudieron cargar: " + error.message)); return; }
    cotizaciones = data;
    [...elegidas].forEach(id => { if (!cotizaciones.some(c => c.id === id)) elegidas.delete(id); });
    pintarCotizaciones();
  }

  const visiblesCot = () => {
    const abiertas = c => c.estado === "nueva" || c.estado === "propuesta";
    return cotizaciones.filter(c =>
      (filtroC === "todas" || (filtroC === "abiertas" ? abiertas(c) : c.estado === filtroC)) &&
      coincide(buscaC, c.nombre, c.negocio, c.email, c.telefono, c.servicio, c.rubro, c.mensaje, c.notas));
  };

  function pintarCotizaciones() {
    const n = k => cotizaciones.filter(c => c.estado === k).length;
    $("#n-cotizaciones").textContent = n("nueva") || "";
    filtro($("#f-cot"), [["abiertas", `Abiertas (${n("nueva") + n("propuesta")})`], ["nueva", `Nuevas (${n("nueva")})`], ["propuesta", `Propuesta enviada (${n("propuesta")})`], ["aceptada", "Aceptadas"], ["descartada", `Descartadas (${n("descartada")})`], ["todas", "Todas"]], filtroC, k => { filtroC = k; pintarCotizaciones(); });
    const lista = visiblesCot();
    $("#l-cotizaciones").replaceChildren(...(lista.length ? lista.map(tarjetaCot) : [el("li", { class: "vacio soft" }, buscaC ? "Ninguna cotización coincide con la búsqueda." : "Sin cotizaciones aquí.")]));
    pintarSeleccion();
    pintarResumen();
  }

  function pintarSeleccion() {
    const vis = visiblesCot();
    const todas = $("#c-todas");
    todas.checked = vis.length > 0 && vis.every(c => elegidas.has(c.id));
    todas.indeterminate = !todas.checked && vis.some(c => elegidas.has(c.id));
    $("#c-grupo").hidden = elegidas.size === 0;
    $("#c-grupo-n").textContent = elegidas.size === 1 ? "1 seleccionada" : `${elegidas.size} seleccionadas`;
  }

  async function cambiarEstadoCot(ids, estadoNuevo) {
    const { error } = await db.from("cotizaciones").update({ estado: estadoNuevo }).in("id", ids);
    if (error) { avisar(error.message, "error"); return false; }
    cotizaciones.forEach(c => { if (ids.includes(c.id)) c.estado = estadoNuevo; });
    pintarCotizaciones();
    return true;
  }

  async function eliminarCot(ids) {
    const una = ids.length === 1 ? cotizaciones.find(c => c.id === ids[0]) : null;
    const ok = await confirmar({
      titulo: una ? `¿Eliminar la cotización de «${una.negocio}»?` : `¿Eliminar ${ids.length} cotizaciones?`,
      texto: "Se borran del panel para siempre. Si alguna ya tiene proyecto, el proyecto se mantiene.",
      boton: una ? "Eliminar" : `Eliminar ${ids.length}`
    });
    if (!ok) return;
    const { data, error } = await db.from("cotizaciones").delete().in("id", ids).select("id");
    if (error) return avisar(error.message, "error");
    const borradas = (data || []).map(x => x.id);
    cotizaciones = cotizaciones.filter(c => !borradas.includes(c.id));
    borradas.forEach(id => elegidas.delete(id));
    pintarCotizaciones();
    avisar(borradas.length === 1 ? "Cotización eliminada." : `${borradas.length} cotizaciones eliminadas.`, borradas.length ? "ok" : "error");
  }

  function tarjetaCot(c) {
    const st = el("p", { class: "status", role: "status", "aria-live": "polite" });
    const waUrl = wa(c.telefono);
    const proyecto = proyectos.find(p => p.cotizacion_id === c.id);
    const marca = el("input", { type: "checkbox", class: "cot-marca", checked: elegidas.has(c.id), "aria-label": `Seleccionar ${c.negocio}`,
      onchange: e => { e.target.checked ? elegidas.add(c.id) : elegidas.delete(c.id); li.classList.toggle("is-sel", e.target.checked); pintarSeleccion(); } });
    const editar = el("div", { class: "cot-editar" });
    const li = el("li", { class: "card cot" + (elegidas.has(c.id) ? " is-sel" : "") },
      el("div", { class: "cot-head" },
        el("div", { class: "cot-tit" }, marca, el("div", {}, el("h3", {}, c.negocio), el("p", { class: "soft" }, `${c.nombre} · ${fecha(c.created_at, true)} · ${ORIGEN[c.origen] || c.origen}`))),
        el("span", { class: `badge c-${c.estado}` }, COT[c.estado])),
      el("dl", { class: "cot-datos" },
        c.servicio ? el("div", {}, el("dt", {}, "Necesita"), el("dd", {}, c.servicio)) : null,
        c.rubro ? el("div", {}, el("dt", {}, "Rubro"), el("dd", {}, c.rubro)) : null,
        c.telefono ? el("div", {}, el("dt", {}, "WhatsApp"), el("dd", {}, c.telefono)) : null,
        c.email ? el("div", {}, el("dt", {}, "Correo"), el("dd", {}, el("a", { href: `mailto:${c.email}` }, c.email))) : null,
        formularios.some(f => f.cotizacion_id === c.id) ? el("div", {}, el("dt", {}, "Formulario"), el("dd", {}, "Completo: pasa al brief al aceptar")) : null),
      c.mensaje ? el("p", { class: "cot-msg" }, c.mensaje) : null,
      c.notas ? el("p", { class: "cot-notas" }, el("strong", {}, "Notas internas: "), c.notas) : null,
      el("div", { class: "btns" },
        c.estado !== "aceptada" ? el("button", { class: "btn btn-sm", type: "button", onclick: () => { li.querySelector(".aceptar").hidden = false; } }, "Aceptada") : null,
        c.estado === "nueva" ? el("button", { class: "btn btn-sm btn-ghost", type: "button", onclick: () => cambiarEstadoCot([c.id], "propuesta") }, "Propuesta enviada") : null,
        c.estado === "nueva" || c.estado === "propuesta" ? el("button", { class: "btn btn-sm btn-ghost", type: "button", onclick: () => cambiarEstadoCot([c.id], "descartada") }, "Descartar") : null,
        c.estado === "descartada" ? el("button", { class: "btn btn-sm btn-ghost", type: "button", onclick: () => cambiarEstadoCot([c.id], "nueva") }, "Volver a abrir") : null,
        proyecto ? el("button", { class: "btn btn-sm btn-ghost", type: "button", onclick: () => { irA($("#t-proyectos")); filtroP = "todos"; pintarProyectos(); abrirProyecto(proyecto.id); } }, "Ver proyecto") : null,
        waUrl ? el("a", { class: "btn btn-sm btn-ghost", href: waUrl + "?text=" + encodeURIComponent(`Hola ${c.nombre.split(" ")[0]}, te escribo de {found} studio por tu cotización.`), target: "_blank", rel: "noopener" }, "WhatsApp") : null,
        el("button", { class: "btn btn-sm btn-ghost", type: "button", "aria-expanded": "false", onclick: e => abrirEditar(c, editar, e.currentTarget) }, "Editar"),
        el("button", { class: "btn btn-sm btn-ghost btn-peligro", type: "button", onclick: () => eliminarCot([c.id]) }, "Eliminar")),
      editar, formAceptar(c), st);
    return li;
  }

  // edición en línea de una cotización (datos, estado y notas internas)
  function abrirEditar(c, cont, boton) {
    if (cont.firstChild) { cont.replaceChildren(); boton.setAttribute("aria-expanded", "false"); return; }
    boton.setAttribute("aria-expanded", "true");
    const uid = "ed" + c.id;
    const campo = (n, label, attrs = {}) => el("div", { class: "field" }, el("label", { for: uid + n }, label), el("input", { id: uid + n, name: n, value: c[n] || "", ...attrs }));
    const f = el("form", { class: "form-inline", novalidate: true },
      el("div", { class: "row-2" }, campo("nombre", "Nombre", { maxlength: "80", required: true }), campo("negocio", "Negocio", { maxlength: "80", required: true })),
      el("div", { class: "row-2" }, campo("telefono", "WhatsApp", { type: "tel", maxlength: "30" }), campo("email", "Correo", { type: "email", maxlength: "120" })),
      el("div", { class: "row-2" }, campo("servicio", "Qué necesita", { maxlength: "80" }), campo("rubro", "Rubro", { maxlength: "80" })),
      el("div", { class: "row-2" },
        el("div", { class: "field" }, el("label", { for: uid + "o" }, "Llegó por"), el("select", { id: uid + "o", name: "origen" }, Object.entries(ORIGEN).map(([k, t]) => el("option", { value: k, selected: k === c.origen }, t)))),
        el("div", { class: "field" }, el("label", { for: uid + "e" }, "Estado"), el("select", { id: uid + "e", name: "estado" }, Object.entries(COT).map(([k, t]) => el("option", { value: k, selected: k === c.estado }, t))))),
      el("div", { class: "field" }, el("label", { for: uid + "m" }, "Mensaje del cliente"), el("textarea", { id: uid + "m", name: "mensaje", rows: "3", maxlength: "2000" }, c.mensaje || "")),
      el("div", { class: "field" }, el("label", { for: uid + "x" }, "Notas internas ", el("small", {}, "(solo las ves tú)")), el("textarea", { id: uid + "x", name: "notas", rows: "3", maxlength: "2000", placeholder: "Precio propuesto, próximos pasos, qué conversaron…" }, c.notas || "")),
      el("div", { class: "btns" }, el("button", { class: "btn btn-sm", type: "submit" }, "Guardar cambios"),
        el("button", { class: "btn btn-sm btn-ghost", type: "button", onclick: () => { cont.replaceChildren(); boton.setAttribute("aria-expanded", "false"); } }, "Cancelar")),
      el("p", { class: "status", role: "status", "aria-live": "polite" }));
    f.addEventListener("submit", async e => {
      e.preventDefault();
      const s = f.querySelector(".status");
      const v = Object.fromEntries([...new FormData(f)].map(([k, x]) => [k, x.trim() || null]));
      if (!v.nombre || !v.negocio) return estado(s, "error", "Faltan el nombre y el negocio.");
      if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) return estado(s, "error", "Revisa el correo: parece incompleto.");
      const { error } = await db.from("cotizaciones").update(v).eq("id", c.id);
      if (error) return estado(s, "error", error.message);
      Object.assign(c, v);
      pintarCotizaciones();
      avisar("Cotización guardada.");
    });
    cont.replaceChildren(f);
    f.querySelector("input").focus();
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
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) return estado(st, "error", "Falta el correo del cliente: sin correo no puede entrar al portal.");
      const btn = f.querySelector("[type=submit]"); btn.disabled = true; estado(st, null, "Creando…");
      try {
        const r = await sesion.funcion("invitar", { cotizacion_id: c.id, telefono: c.telefono, ...d });
        const fo = formularios.find(x => x.cotizacion_id === c.id);   // si completó el formulario, el cliente parte con su brief lleno
        if (fo) await db.from("briefs").update({ respuestas: { ...fo.respuestas, Nombre: d.nombre.trim(), Negocio: d.negocio.trim(), Correo: d.email.trim(), ...(c.telefono ? { WhatsApp: c.telefono } : {}), Proyecto: d.servicio } }).eq("proyecto_id", r.proyecto_id);
        await Promise.all([cargarCotizaciones(), cargarProyectos()]);
        $("#t-proyectos").click(); abrirProyecto(r.proyecto_id);
      } catch (err) { estado(st, "error", err.message); btn.disabled = false; }
    });
    return f;
  }

  $("#c-buscar").addEventListener("input", e => { buscaC = norm(e.target.value.trim()); pintarCotizaciones(); });
  $("#c-todas").addEventListener("change", e => {
    visiblesCot().forEach(c => e.target.checked ? elegidas.add(c.id) : elegidas.delete(c.id));
    pintarCotizaciones();
  });
  $("#c-g-descartar").addEventListener("click", async () => { if (await cambiarEstadoCot([...elegidas], "descartada")) { avisar("Cotizaciones descartadas."); elegidas.clear(); pintarCotizaciones(); } });
  $("#c-g-eliminar").addEventListener("click", () => eliminarCot([...elegidas]));
  $("#c-g-limpiar").addEventListener("click", () => { elegidas.clear(); pintarCotizaciones(); });
  $("#c-csv").addEventListener("click", () => descargarCSV("cotizaciones", visiblesCot().map(c => ({
    Fecha: new Date(c.created_at).toLocaleString("es-CL"), Estado: COT[c.estado], Origen: ORIGEN[c.origen] || c.origen, Nombre: c.nombre, Negocio: c.negocio,
    Rubro: c.rubro, Servicio: c.servicio, WhatsApp: c.telefono, Correo: c.email, Mensaje: c.mensaje, Notas: c.notas }))));

  $("#c-nueva").addEventListener("click", () => { $("#c-form").hidden = false; $("#c-nombre").focus(); });
  $("#c-cancelar").addEventListener("click", () => { $("#c-form").hidden = true; });
  $("#c-form").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target, st = f.querySelector(".status"), d = Object.fromEntries(new FormData(f));
    if (!d.nombre.trim() || !d.negocio.trim()) return estado(st, "error", "Faltan el nombre y el negocio.");
    const fila = Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.trim() || null]));
    const { error } = await db.from("cotizaciones").insert({ ...fila, estado: "nueva" });
    if (error) return estado(st, "error", error.message);
    f.reset(); f.hidden = true; st.textContent = "";
    avisar("Cotización agregada.");
    await cargarCotizaciones();
  });

  /* ---------- formularios «Lo que te solicitamos» (/brief/) ---------- */
  const FORM = { nuevo: "Nuevo", revisado: "Revisado", archivado: "Archivado" };
  const texto = v => [].concat(v).join(", ");
  async function cargarFormularios() {
    const { data, error } = await db.from("formularios").select("*").order("created_at", { ascending: false }).limit(300);
    if (error) { $("#l-formularios").replaceChildren(el("li", { class: "soft" }, "No se pudieron cargar: " + error.message)); return; }
    formularios = data;
    pintarFormularios();
  }

  function pintarFormularios() {
    const n = k => formularios.filter(f => f.estado === k).length;
    $("#n-formularios").textContent = n("nuevo") || "";
    filtro($("#f-form"), [["nuevo", `Nuevos (${n("nuevo")})`], ["revisado", "Revisados"], ["archivado", "Archivados"], ["todos", "Todos"]], filtroF, k => { filtroF = k; pintarFormularios(); });
    const lista = formularios.filter(f => filtroF === "todos" || f.estado === filtroF);
    $("#l-formularios").replaceChildren(...(lista.length ? lista.map(tarjetaForm)
      : [el("li", { class: "vacio soft" }, filtroF === "nuevo" ? "No hay formularios nuevos. Llegan aquí cuando alguien completa «Lo que te solicitamos» en el sitio." : "Nada por aquí.")]));
  }

  async function cambiarForm(f, cambio) {
    const { error } = await db.from("formularios").update(cambio).eq("id", f.id);
    if (error) { avisar(error.message, "error"); return false; }
    Object.assign(f, cambio); pintarFormularios(); return true;
  }

  async function eliminarForm(f) {
    if (!await confirmar({ titulo: `¿Eliminar el formulario de «${f.negocio}»?`, texto: "Se borran sus respuestas del panel para siempre. Si ya tiene cotización, la cotización se mantiene." })) return;
    const { data, error } = await db.from("formularios").delete().eq("id", f.id).select("id");
    if (error || !data?.length) return avisar(error ? error.message : "No se pudo eliminar el formulario.", "error");
    formularios = formularios.filter(x => x.id !== f.id);
    pintarFormularios(); pintarCotizaciones();
    avisar("Formulario eliminado.");
  }

  // crea la cotización con los datos del formulario; al aceptarla, las respuestas pasan al brief del proyecto
  async function formACotizacion(f, boton) {
    const r = f.respuestas || {};
    boton.disabled = true;
    const { data: c, error } = await db.from("cotizaciones").insert({
      origen: "formulario", estado: "nueva", nombre: f.nombre, negocio: f.negocio,
      rubro: r.Rubro ? texto(r.Rubro).slice(0, 80) : null, servicio: SERVICIOS[f.proyecto] || null,
      telefono: f.telefono, email: f.email, consentimiento: f.consentimiento,
      mensaje: (`Completó «Lo que te solicitamos» el ${fecha(f.created_at, true)}.` + (r["Qué hace"] ? ` ${texto(r["Qué hace"])}` : "")).slice(0, 2000)
    }).select("id").single();
    if (error) { boton.disabled = false; return avisar(error.message, "error"); }
    if (!await cambiarForm(f, { cotizacion_id: c.id, estado: "revisado" })) return;
    await cargarCotizaciones();
    filtroC = "nueva"; pintarCotizaciones(); irA($("#t-cotizaciones"));
    avisar("Cotización creada desde el formulario.");
  }

  function tarjetaForm(f) {
    const r = f.respuestas || {};
    const filas = Object.entries(r).map(([k, v]) => [k, k === "Proyecto" ? SERVICIOS[v] || v : texto(v)]).filter(([, v]) => String(v).trim());
    const waUrl = wa(f.telefono);
    const copiar = el("button", { class: "btn btn-sm btn-ghost", type: "button", onclick: async () => {
      try { await navigator.clipboard.writeText(`Formulario de ${f.negocio}\n\n` + filas.map(([k, v]) => `${k}: ${v}`).join("\n")); avisar("Respuestas copiadas."); }
      catch (_) { avisar("No se pudo copiar.", "error"); }
    } }, "Copiar texto");
    return el("li", { class: "card cot" },
      el("div", { class: "cot-head" },
        el("div", {}, el("h3", {}, f.negocio), el("p", { class: "soft" }, `${f.nombre} · ${fecha(f.created_at, true)}` + (f.proyecto ? ` · ${SERVICIOS[f.proyecto] || f.proyecto}` : ""))),
        el("span", { class: `badge f-${f.estado}` }, FORM[f.estado])),
      el("dl", { class: "cot-datos" },
        f.telefono ? el("div", {}, el("dt", {}, "WhatsApp"), el("dd", {}, f.telefono)) : null,
        f.email ? el("div", {}, el("dt", {}, "Correo"), el("dd", {}, el("a", { href: `mailto:${f.email}` }, f.email))) : null,
        f.cotizacion_id ? el("div", {}, el("dt", {}, "Cotización"), el("dd", {}, "Creada")) : null),
      el("details", { class: "form-resp", open: f.estado === "nuevo" },
        el("summary", {}, `Respuestas (${filas.length})`),
        el("dl", { class: "respuestas" }, filas.map(([k, v]) => el("div", {}, el("dt", {}, k), el("dd", {}, v)))),
        el("p", { class: "soft form-consent" }, f.consentimiento)),
      el("div", { class: "btns" },
        !f.cotizacion_id ? el("button", { class: "btn btn-sm", type: "button", onclick: e => formACotizacion(f, e.currentTarget) }, "Crear cotización") : null,
        f.estado === "nuevo" ? el("button", { class: "btn btn-sm btn-ghost", type: "button", onclick: () => cambiarForm(f, { estado: "revisado" }) }, "Marcar revisado") : null,
        f.estado !== "archivado" ? el("button", { class: "btn btn-sm btn-ghost", type: "button", onclick: () => cambiarForm(f, { estado: "archivado" }) }, "Archivar")
          : el("button", { class: "btn btn-sm btn-ghost", type: "button", onclick: () => cambiarForm(f, { estado: "nuevo" }) }, "Recuperar"),
        copiar,
        waUrl ? el("a", { class: "btn btn-sm btn-ghost", href: waUrl + "?text=" + encodeURIComponent(`Hola ${f.nombre.split(" ")[0]}, te escribo de {found} studio: recibimos lo que nos mandaste de ${f.negocio}.`), target: "_blank", rel: "noopener" }, "WhatsApp") : null,
        el("button", { class: "btn btn-sm btn-ghost btn-peligro", type: "button", onclick: () => eliminarForm(f) }, "Eliminar")));
  }

  /* ---------- estimados del asistente ---------- */
  async function cargarEstimados() {
    const { data, error } = await db.from("estimados").select("*").order("created_at", { ascending: false }).limit(1000);
    if (error) { $("#e-filas").replaceChildren(el("tr", {}, el("td", { colspan: 6 }, error.message))); return; }
    estimados = data;
    pintarEstimados();
  }

  function pintarEstimados() {
    const mes = estimados.filter(x => Date.now() - new Date(x.created_at) < 30 * DIA);
    const cuenta = k => mes.filter(x => x.servicio === k).length;
    const prom = mes.length ? mes.reduce((a, x) => a + (x.rango_min + x.rango_max) / 2, 0) / mes.length : 0;
    $("#e-kpis").replaceChildren(
      el("div", { class: "kpi" }, el("b", {}, mes.length), el("span", {}, "estimados en 30 días")),
      el("div", { class: "kpi" }, el("b", {}, cuenta("pagina")), el("span", {}, "páginas web")),
      el("div", { class: "kpi" }, el("b", {}, cuenta("tienda")), el("span", {}, "tiendas online")),
      el("div", { class: "kpi" }, el("b", {}, cuenta("sistema")), el("span", {}, "sistemas")),
      el("div", { class: "kpi" }, el("b", {}, mes.length ? clp(prom) : "—"), el("span", {}, "punto medio promedio")));
    const viejos = estimados.filter(x => Date.now() - new Date(x.created_at) > 180 * DIA).length;
    $("#e-viejos").hidden = viejos === 0;
    $("#e-viejos").textContent = `Borrar los de más de 6 meses (${viejos})`;
    $("#e-filas").replaceChildren(...(estimados.length ? estimados.map(x => el("tr", {},
      el("td", {}, fecha(x.created_at, true)), el("td", {}, SERVICIOS[x.servicio] || (x.servicio === "sistema" ? "Sistema" : x.servicio)), el("td", {}, x.rubro || "—"),
      el("td", { class: "num" }, `${clp(x.rango_min)} a ${clp(x.rango_max)}`), el("td", { class: "soft" }, (x.detalle?.incluye || []).join(", ")),
      el("td", {}, el("button", { class: "btn-x", type: "button", "aria-label": `Eliminar estimado del ${fecha(x.created_at, true)}`, title: "Eliminar", onclick: () => eliminarEstimados([x.id]) }, "×"))))
      : [el("tr", {}, el("td", { colspan: 6, class: "soft" }, "Todavía nadie ha calculado un estimado."))]));
  }

  async function eliminarEstimados(ids, preguntar = false) {
    if (preguntar && !await confirmar({ titulo: `¿Eliminar ${ids.length} estimados?`, texto: "Son los estimados del asistente con más de 6 meses. No se puede deshacer." })) return;
    const { data, error } = await db.from("estimados").delete().in("id", ids).select("id");
    if (error) return avisar(error.message, "error");
    const borrados = (data || []).map(x => x.id);
    estimados = estimados.filter(x => !borrados.includes(x.id));
    pintarEstimados();
    avisar(borrados.length === 1 ? "Estimado eliminado." : `${borrados.length} estimados eliminados.`, borrados.length ? "ok" : "error");
  }

  $("#e-viejos").addEventListener("click", () => eliminarEstimados(estimados.filter(x => Date.now() - new Date(x.created_at) > 180 * DIA).map(x => x.id), true));
  $("#e-csv").addEventListener("click", () => descargarCSV("estimados", estimados.map(x => ({
    Fecha: new Date(x.created_at).toLocaleString("es-CL"), Servicio: SERVICIOS[x.servicio] || x.servicio, Rubro: x.rubro,
    Desde: x.rango_min, Hasta: x.rango_max, Incluye: (x.detalle?.incluye || []).join(", ") }))));

  /* ---------- visitas (GoatCounter, a través de la función del servidor) ---------- */
  // nombres claros para las rutas, los orígenes y los eventos de track() (ver site.js)
  const PAGINA = { "/": "Inicio", "/servicios": "Servicios", "/ejemplos": "Ejemplos", "/contacto": "Contacto", "/brief": "Formulario «Lo que te solicitamos»",
    "/mi-proyecto": "Portal del cliente", "/privacidad.html": "Privacidad", "/404.html": "Página no encontrada" };
  const EVENTO = {
    whatsapp_click: "Abrieron WhatsApp", form_submit_ok: "Enviaron el formulario de contacto", brief_submit_ok: "Enviaron el formulario «Lo que te solicitamos»",
    asistente_inicio: "Abrieron el asistente", asistente_estimado: "Recibieron un precio estimado", asistente_pregunta: "Le preguntaron algo al asistente",
    cta_asistente: "Botón para abrir el asistente", cta_cotizar: "Botón «Cotizar»", caso_click: "Abrieron un caso de cliente",
    brief_abrir: "Abrieron «Lo que te solicitamos»", brief_start: "Empezaron «Lo que te solicitamos»", form_start: "Empezaron el formulario de contacto",
    demo_rubro: "Cambiaron de rubro en Ejemplos", demo_interaccion: "Probaron un ejemplo", busca_escrita: "Buscaron su rubro",
    archivo_subido: "Un cliente subió archivos", form_error: "Error al enviar el formulario", brief_error: "Error al enviar «Lo que te solicitamos»",
  };
  const DETALLE = { asistente: "asistente", "asistente-menu": "menú del asistente", barra: "barra superior", portada: "portada", pie: "pie de página",
    pagina: "página web", tienda: "tienda online", sistema: "sistema", software: "sistema", varios: "varios", otro: "otro rubro", portal: "portal" };
  const nombrePagina = r => PAGINA[r.replace(/\/$/, "") || "/"] || r;
  const nombreOrigen = n => n === "(directo)" ? "Directo" : /instagram/i.test(n) ? "Instagram" : /facebook|fb\.com/i.test(n) ? "Facebook"
    : /whatsapp|wa\.me/i.test(n) ? "WhatsApp" : /google/i.test(n) ? "Google" : /bing/i.test(n) ? "Bing" : n.replace(/^(www|l|m)\./, "");
  const AYUDA_ORIGEN = { Directo: "escribieron la dirección o abrieron un link guardado o compartido por chat", Instagram: "desde tu perfil o una historia", Google: "buscando en Google" };
  const num = x => x.toLocaleString("es-CL");

  // fila con barra proporcional (el ancho va por CSSOM, que la CSP sí permite)
  const filaBarra = (nombre, valor, max, nota) => {
    const barra = el("i");
    barra.style.setProperty("--w", `${Math.max(4, Math.round(valor / (max || 1) * 100))}%`);
    return el("li", {}, el("div", { class: "vi-fila" }, el("span", {}, nombre), el("b", {}, num(valor))),
      el("span", { class: "vi-barra", "aria-hidden": "true" }, barra), nota ? el("small", {}, nota) : null);
  };
  const bloque = (titulo, ayuda, filas, vacio = "Todavía no hay datos.") => el("section", { class: "card vi-bloque" },
    el("h3", {}, titulo), ayuda ? el("p", { class: "soft vi-ayuda" }, ayuda) : null,
    filas.length ? el("ol", { class: "vi-lista" }, filas) : el("p", { class: "soft" }, vacio));

  async function cargarVisitas() {
    const c = $("#vi-cont");
    c.replaceChildren(el("p", { class: "soft" }, "Cargando visitas…"));
    try {
      const v = await sesion.funcion("visitas");
      if (!v.configurado) { c.replaceChildren(el("p", { class: "soft" }, "Para ver las visitas aquí, agrega el secreto GOATCOUNTER_TOKEN a la función (paso 7 de docs/PORTAL.md). Mientras, míralas en GoatCounter.")); return; }

      // páginas: se juntan /contacto y /contacto/
      const paginas = Object.values(v.paginas.filter(p => !p.evento).reduce((acc, p) => {
        const nom = nombrePagina(p.ruta); (acc[nom] ??= { nombre: nom, visitas: 0 }).visitas += p.visitas; return acc;
      }, {})).sort((a, b) => b.visitas - a.visitas);

      // eventos: evento/<nombre>/<detalle…> → se agrupan por nombre y se guarda de dónde vinieron
      const eventos = {};
      for (const e of v.paginas.filter(p => p.evento)) {
        const [, nombre, ...det] = e.ruta.split("/");
        const g = eventos[nombre] ??= { nombre, visitas: 0, det: {} };
        g.visitas += e.visitas;
        const d = det.filter(x => !/^\d+k-\d+k$/.test(x)).map(x => DETALLE[x] || x.replace(/^\//, "") || "inicio").join(", ");
        if (d) g.det[d] = (g.det[d] || 0) + e.visitas;
      }
      const ev = k => eventos[k]?.visitas || 0;
      const visitas = Math.max(v.total - v.eventos, 0);
      const contactos = ev("whatsapp_click") + ev("form_submit_ok");

      const kpi = (valor, texto, destacado) => el("div", { class: "kpi" + (destacado ? " vi-kpi-on" : "") }, el("b", {}, num(valor)), el("span", {}, texto));
      const pasos = [
        ["Entraron al sitio", visitas], ["Abrieron el asistente", ev("asistente_inicio")],
        ["Recibieron un precio", ev("asistente_estimado")], ["Te contactaron", contactos],
      ];
      const maxPaso = Math.max(...pasos.map(p => p[1]), 1);
      const origenes = v.origenes.map(o => ({ ...o, nombre: nombreOrigen(o.nombre) }));
      const maxOrig = Math.max(...origenes.map(o => o.visitas), 1), maxPag = Math.max(...paginas.map(p => p.visitas), 1);
      const acciones = Object.values(eventos).sort((a, b) => b.visitas - a.visitas), maxAcc = Math.max(...acciones.map(a => a.visitas), 1);
      const hora = new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

      c.replaceChildren(
        el("div", { class: "vi-head" },
          el("p", { class: "soft" }, `Últimos 30 días · actualizado a las ${hora}`),
          el("button", { class: "btn btn-sm btn-ghost", type: "button", onclick: cargarVisitas }, "Actualizar visitas")),
        el("div", { class: "kpis" },
          kpi(visitas, "visitas al sitio"),
          kpi(ev("asistente_inicio"), "usaron el asistente"),
          kpi(ev("asistente_estimado"), "recibieron un precio"),
          kpi(contactos, "te contactaron (WhatsApp o formulario)", true)),
        bloque("Cómo avanzan", "De la gente que entra, cuántos llegan a cada paso. Algunos te escriben directo, sin pasar por el asistente.",
          pasos.map(([nom, val], i) => filaBarra(nom, val, maxPaso, i && visitas ? `${Math.min(100, Math.round(val / visitas * 100))}% de las visitas` : null))),
        el("div", { class: "vi-grid" },
          bloque("De dónde llegan", "Por dónde entró la gente al sitio.",
            origenes.slice(0, 8).map(o => filaBarra(o.nombre, o.visitas, maxOrig, AYUDA_ORIGEN[o.nombre]))),
          bloque("Qué páginas ven", "Cuántas personas abrieron cada página.",
            paginas.slice(0, 8).map(p => filaBarra(p.nombre, p.visitas, maxPag)))),
        bloque("Qué hacen en el sitio", "Clics y envíos. Entre paréntesis, desde dónde lo hicieron.",
          acciones.slice(0, 12).map(a => {
            const det = Object.entries(a.det).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([d, k]) => `${d} (${k})`).join(" · ");
            return filaBarra(EVENTO[a.nombre] || a.nombre.replace(/_/g, " "), a.visitas, maxAcc, det);
          }), "Nadie ha hecho clic en nada todavía."));
    } catch (e) { c.replaceChildren(el("p", { class: "status", "data-kind": "error" }, "No se pudieron cargar las visitas: " + e.message)); }
  }

  /* ---------- actualizar todo ---------- */
  $("#a-actualizar").addEventListener("click", async e => {
    const b = e.currentTarget; b.disabled = true; b.textContent = "Actualizando…";
    await Promise.all([cargarProyectos(), cargarCotizaciones(), cargarFormularios(), $("#v-estimados").hidden ? null : cargarEstimados(), $("#v-visitas").hidden ? null : cargarVisitas()]);
    const m = location.hash.match(/p=([0-9a-f-]{36})/);
    if (m && proyectos.some(p => p.id === m[1])) abrirProyecto(m[1]);
    b.disabled = false; b.textContent = "Actualizar";
    avisar("Panel al día.");
  });

  iniciar().catch(err => { console.warn("[panel]", err); $("#a-cargando").hidden = false; $("#a-cargando").textContent = "Algo falló al cargar. Recarga la página."; });
})();
