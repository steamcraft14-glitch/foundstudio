/* {found} studio · /mi-proyecto/
   Portal del cliente: estado del proyecto, brief que se guarda solo y subida de logo y fotos.
   Las preguntas del brief se toman de /brief/index.html, así hay una sola fuente. */
(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const mostrar = id => ["#p-cargando", "#p-off", "#p-entrada", "#p-app"].forEach(s => { $(s).hidden = s !== id; });
  let db, proyecto, brief, guardarT;

  async function iniciar() {
    if (!sesion.activo()) return mostrar("#p-off");
    db = sesion.db();
    const user = await sesion.usuario();
    if (!user) { sesion.montarEntrada($("#p-entrada")); return mostrar("#p-entrada"); }
    $("#p-salir").hidden = false;
    $("#p-salir").addEventListener("click", () => sesion.salir());
    $("#p-clave-user").value = user.email;
    sesion.montarClave($("#p-clave-form"));

    const { data: proyectos, error } = await db.from("proyectos").select("*").order("created_at", { ascending: false });
    if (error) return falla("No pudimos cargar tu proyecto. Recarga la página en un rato.");
    if (!proyectos.length) return falla("Todavía no hay un proyecto asociado a tu correo. Escríbenos por WhatsApp y lo revisamos.");
    if (proyectos.length > 1) {
      const sel = $("#p-sel");
      proyectos.forEach(p => sel.append(el("option", { value: p.id }, p.negocio)));
      sel.addEventListener("change", () => abrir(proyectos.find(p => p.id === sel.value)));
      $("#p-sel-wrap").hidden = false;
    }
    mostrar("#p-app");
    await prepararBrief();
    abrir(proyectos[0]);
  }

  const falla = msg => { mostrar("#p-cargando"); $("#p-cargando").textContent = msg; };

  async function abrir(p) {
    proyecto = p;
    $("#p-titulo").textContent = p.negocio;
    $("#p-sub").textContent = `Hola, ${p.cliente_nombre.split(" ")[0]}. Aquí ves en qué va tu página, completas el brief y nos mandas tus archivos.`;
    const [{ data: hist }, { data: b }] = await Promise.all([
      db.from("historial").select("estado, created_at").eq("proyecto_id", p.id).order("created_at"),
      db.from("briefs").select("*").eq("proyecto_id", p.id).maybeSingle()
    ]);
    pintarEtapas(p, hist || []);
    brief = b || { respuestas: {}, enviado_at: null };
    cargarBrief();
    listarArchivos();
  }

  /* ---------- etapas ---------- */
  function pintarEtapas(p, hist) {
    const actual = ESTADOS.findIndex(([k]) => k === p.estado);
    const cuando = k => k === "aceptada" ? p.created_at : (hist.find(h => h.estado === k) || {}).created_at;
    $("#p-etapas").replaceChildren(...ESTADOS.map(([k, nombre], i) => el("li",
      { class: i < actual ? "hecho" : i === actual ? "actual" : "", "aria-current": i === actual ? "step" : null },
      el("span", { class: "etapa-nombre" }, nombre),
      el("span", { class: "etapa-fecha" }, i <= actual && cuando(k) ? fecha(cuando(k)) : i === actual ? "Ahora" : ""))));
    const url = $("#p-url");
    url.hidden = !(p.estado === "publicado" && p.url_publicada);
    if (!url.hidden) url.replaceChildren("Tu página está en línea: ", el("a", { href: p.url_publicada, target: "_blank", rel: "noopener" }, p.url_publicada.replace(/^https?:\/\//, "")));
  }

  /* ---------- brief ---------- */
  async function prepararBrief() {
    const html = await fetch("/brief/", { credentials: "same-origin" }).then(r => r.text());
    const doc = new DOMParser().parseFromString(html, "text/html");
    const form = $("#pb-form");
    doc.querySelectorAll("#brief-form > .bsec").forEach(sec => form.append(document.importNode(sec, true)));
    form.querySelector("#s-datos .hint")?.remove();
    form.querySelectorAll("a[data-msg]").forEach(a => { a.href = waLink(a.dataset.msg); });
    form.querySelectorAll("[required]").forEach(x => x.removeAttribute("required"));
    form.addEventListener("input", alCambiar);
    form.addEventListener("change", alCambiar);
    $("#pb-enviar").addEventListener("click", enviarBrief);
  }

  const campos = () => [...$("#pb-form").elements].filter(x => x.name);
  const leer = () => {
    const out = {};
    campos().forEach(x => {
      if (x.type === "checkbox") { if (x.checked) (out[x.name] = out[x.name] || []).push(x.value); }
      else if (x.type === "radio") { if (x.checked) out[x.name] = x.value; }
      else if (x.value.trim()) out[x.name] = x.value;
    });
    return out;
  };

  function aplicarTipo() {
    const t = $("#pb-form").elements.Proyecto?.value || "";
    $("#pb-form").querySelectorAll("[data-solo]").forEach(s => { s.hidden = !(!t || t === "varios" || t === s.dataset.solo); });
  }

  function cargarBrief() {
    const r = brief.respuestas || {};
    campos().forEach(x => {
      const v = r[x.name];
      if (x.type === "checkbox") x.checked = [].concat(v || []).includes(x.value);
      else if (x.type === "radio") x.checked = x.value === v;
      else x.value = v == null ? "" : String(v);
    });
    if (!r.Proyecto && proyecto.servicio) $("#pb-form").elements.Proyecto.value = proyecto.servicio;
    aplicarTipo();
    const cerrado = !!brief.enviado_at;
    $("#pb-form").querySelectorAll(".bsec").forEach(s => { s.disabled = cerrado; });
    $("#pb-fin").hidden = cerrado;
    $("#pb-estado").textContent = cerrado ? `Enviado el ${fecha(brief.enviado_at)}` : brief.actualizado_at && Object.keys(r).length > 5 ? `Guardado ${fecha(brief.actualizado_at, true)}` : "";
    $("#pb-intro").textContent = cerrado
      ? "Ya recibimos tu brief. Si necesitas cambiar algo, escríbenos por WhatsApp."
      : "Completa lo que puedas; se guarda solo mientras escribes y puedes volver cuando quieras. Si algo no lo sabes, déjalo en blanco.";
  }

  function alCambiar(e) {
    if (e.target.name === "Proyecto") aplicarTipo();
    if (brief.enviado_at) return;
    $("#pb-estado").textContent = "Guardando…";
    clearTimeout(guardarT);
    guardarT = setTimeout(guardarBrief, 800);
  }

  async function guardarBrief() {
    clearTimeout(guardarT);
    const respuestas = leer();
    const { error } = await db.from("briefs").update({ respuestas, actualizado_at: new Date().toISOString() }).eq("proyecto_id", proyecto.id);
    if (error) { $("#pb-estado").textContent = "No se pudo guardar. Revisa tu conexión; reintentamos al seguir escribiendo."; return false; }
    brief.respuestas = respuestas;
    $("#pb-estado").textContent = `Guardado ${new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}`;
    return true;
  }

  async function enviarBrief() {
    const st = $("#pb-status"), btn = $("#pb-enviar");
    st.removeAttribute("data-kind"); st.textContent = "";
    const respondidas = [...$("#pb-form").querySelectorAll(".bsec:not(#s-datos)")].flatMap(s => [...s.elements])
      .filter(x => x.name && ((x.type === "checkbox" || x.type === "radio") ? x.checked : x.value.trim())).map(x => x.name);
    if (new Set(respondidas).size < 3) { st.dataset.kind = "error"; st.textContent = "El brief está casi vacío. Completa al menos lo básico de tu negocio antes de enviarlo."; return; }
    if (!confirm("¿Enviar el brief? Después ya no se puede editar desde aquí.")) return;
    btn.disabled = true; btn.textContent = "Enviando…";
    try {
      if (!(await guardarBrief())) throw new Error("No se pudo guardar el último cambio.");
      await sesion.funcion("brief-enviado", { proyecto_id: proyecto.id });
      track("brief_submit_ok", { donde: "portal" });
      const { data } = await db.from("proyectos").select("*").eq("id", proyecto.id).single();
      await abrir(data || proyecto);
      $("#h-estado").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    } catch (err) {
      st.dataset.kind = "error";
      st.textContent = `No pudimos enviarlo (${err.message}). Tus respuestas están guardadas: intenta de nuevo o escríbenos por WhatsApp.`;
    } finally { btn.disabled = false; btn.textContent = "Enviar brief"; }
  }

  /* ---------- archivos ---------- */
  const MAX = 25 * 1024 * 1024;
  const limpio = n => n.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-80);
  const peso = b => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

  async function listarArchivos() {
    const lista = $("#pa-lista");
    const { data, error } = await db.storage.from("archivos").list(proyecto.id, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
    if (error) { lista.replaceChildren(el("li", { class: "soft" }, "No pudimos cargar tus archivos.")); return; }
    const files = (data || []).filter(f => f.id);
    if (!files.length) { lista.replaceChildren(el("li", { class: "vacio soft" }, "Aún no has subido archivos.")); return; }
    const imgs = files.filter(f => /^image\/(jpeg|png|webp|gif)/.test(f.metadata?.mimetype || ""));
    const { data: urls } = imgs.length ? await db.storage.from("archivos").createSignedUrls(imgs.map(f => `${proyecto.id}/${f.name}`), 3600) : { data: [] };
    const url = n => (urls || []).find(u => u.path === `${proyecto.id}/${n}`)?.signedUrl;
    lista.replaceChildren(...files.map(f => el("li", {},
      url(f.name) ? el("img", { src: url(f.name), alt: "", loading: "lazy", width: 56, height: 56 }) : el("span", { class: "tipo", "aria-hidden": "true" }, (f.name.split(".").pop() || "").slice(0, 4).toUpperCase()),
      el("span", { class: "nombre" }, f.name.replace(/^\d+-/, ""), el("small", {}, ` · ${peso(f.metadata?.size || 0)}`)),
      el("button", { type: "button", class: "btn btn-ghost btn-sm", "aria-label": `Quitar ${f.name.replace(/^\d+-/, "")}`, onclick: () => quitar(f.name) }, "Quitar"))));
  }

  async function subir(files) {
    const st = $("#pa-status");
    st.removeAttribute("data-kind");
    const lista = [...files];
    const grandes = lista.filter(f => f.size > MAX);
    let ok = 0, malos = [];
    for (const [i, f] of lista.filter(f => f.size <= MAX).entries()) {
      st.textContent = `Subiendo ${i + 1} de ${lista.length - grandes.length}: ${f.name}…`;
      const { error } = await db.storage.from("archivos").upload(`${proyecto.id}/${Date.now()}-${limpio(f.name)}`, f, { contentType: f.type || undefined, upsert: false });
      if (error) malos.push(f.name); else ok++;
    }
    const partes = [];
    if (ok) partes.push(`${ok} ${ok === 1 ? "archivo subido" : "archivos subidos"}.`);
    if (grandes.length) partes.push(`Muy pesados (más de 25 MB): ${grandes.map(f => f.name).join(", ")}. Mándalos por WhatsApp o un enlace de Drive.`);
    if (malos.length) partes.push(`No se pudieron subir: ${malos.join(", ")} (formato no permitido o sin conexión).`);
    st.dataset.kind = grandes.length || malos.length ? "error" : "ok";
    st.textContent = partes.join(" ");
    if (ok) track("archivo_subido", { cantidad: ok });
    listarArchivos();
  }

  async function quitar(nombre) {
    if (!confirm(`¿Quitar ${nombre.replace(/^\d+-/, "")}?`)) return;
    await db.storage.from("archivos").remove([`${proyecto.id}/${nombre}`]);
    listarArchivos();
  }

  const input = $("#pa-input"), zona = $(".subir");
  input.addEventListener("change", () => { if (input.files.length) subir(input.files); input.value = ""; });
  ["dragenter", "dragover"].forEach(t => zona.addEventListener(t, e => { e.preventDefault(); zona.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach(t => zona.addEventListener(t, e => { e.preventDefault(); zona.classList.remove("is-over"); }));
  zona.addEventListener("drop", e => { if (e.dataTransfer.files.length) subir(e.dataTransfer.files); });

  iniciar().catch(err => { console.warn("[portal]", err); falla("Algo falló al cargar. Recarga la página."); });
})();
