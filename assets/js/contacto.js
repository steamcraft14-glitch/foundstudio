/* {found} studio · /contacto/
   Formulario de cotización con Web3Forms. Si el envío falla, ofrece WhatsApp con los datos ya escritos.
   Sin JavaScript, el formulario se envía igual a Web3Forms (action + campo access_key). */
(() => {
  "use strict";
  const form = document.getElementById("cotizar");
  if (!form) return;
  const $ = s => form.querySelector(s);
  const status = document.getElementById("f-status");
  const { WEB3FORMS_KEY, PRIVACIDAD_VERSION } = window.FOUND;

  /* Rellena rubro, servicio y negocio si vienen en el enlace (?rubro=barberia&servicio=pagina) */
  const qs = new URLSearchParams(location.search);
  ["rubro", "servicio"].forEach(k => { const v = qs.get(k), el = form.elements[k]; if (v && el && [...el.options].some(o => o.value === v)) el.value = v; });
  if (qs.get("negocio")) form.elements.negocio.value = qs.get("negocio").slice(0, 80);
  if (qs.get("resumen")) form.elements.mensaje.value = qs.get("resumen").slice(0, 900); // viene del asistente de estimado

  const MSG = {
    nombre: "Escribe tu nombre.",
    negocio: "Escribe el nombre de tu negocio (o “aún no tiene nombre”).",
    telefono: "Déjanos un WhatsApp o un correo para responderte.",
    email: "Revisa el correo: parece incompleto.",
    consiento: "Necesitamos tu aceptación para poder responderte."
  };
  const setErr = (name, msg) => {
    const field = form.elements[name], el = document.getElementById("e-" + name);
    if (el) el.textContent = msg || "";
    if (msg) { field.setAttribute("aria-invalid", "true"); field.setAttribute("aria-describedby", "e-" + name); }
    else { field.removeAttribute("aria-invalid"); field.removeAttribute("aria-describedby"); }
    return !msg;
  };
  const validate = () => {
    const f = form.elements, bad = [];
    const tel = f.telefono.value.trim(), mail = f.email.value.trim();
    if (!setErr("nombre", f.nombre.value.trim() ? "" : MSG.nombre)) bad.push(f.nombre);
    if (!setErr("negocio", f.negocio.value.trim() ? "" : MSG.negocio)) bad.push(f.negocio);
    const telOk = tel.replace(/\D/g, "").length >= 8;
    const mailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail);
    if (!setErr("telefono", telOk || mailOk ? "" : MSG.telefono)) bad.push(f.telefono);
    if (!setErr("email", !mail || mailOk ? "" : MSG.email)) bad.push(f.email);
    if (!setErr("consiento", f.consiento.checked ? "" : MSG.consiento)) bad.push(f.consiento);
    return bad;
  };
  form.addEventListener("input", e => { if (e.target.getAttribute("aria-invalid")) validate(); });
  form.addEventListener("change", e => { if (e.target.getAttribute("aria-invalid")) validate(); });

  let started = false;
  form.addEventListener("focusin", () => { if (!started) { started = true; track("form_start"); } });

  const waFallback = d => waLink(`Hola {found}, soy ${d.nombre} de ${d.negocio}${d.rubro ? " (" + d.rubro + ")" : ""}. Quiero cotizar${d.servicio ? " " + d.servicio : ""}. ${d.mensaje || ""}`.trim());

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (form.elements.botcheck.checked) return; // trampa anti-spam
    const bad = validate();
    if (bad.length) { bad[0].focus(); status.removeAttribute("data-kind"); status.textContent = ""; return; }

    const d = Object.fromEntries(new FormData(form));
    const rubroTxt = form.elements.rubro.selectedOptions[0]?.textContent || "";
    const servTxt = form.elements.servicio.selectedOptions[0]?.textContent || "";
    const payload = {
      access_key: WEB3FORMS_KEY,
      subject: `Cotización web: ${d.negocio.trim()}`,
      from_name: "foundstudio.cl",
      nombre: d.nombre.trim(),
      negocio: d.negocio.trim(),
      rubro: d.rubro ? rubroTxt : "Sin indicar",
      servicio: d.servicio ? servTxt : "Aún no lo sabe",
      telefono: d.telefono.trim() || "—",
      email: d.email.trim() || "—",
      mensaje: d.mensaje.trim() || "—",
      pagina: location.href,
      // registro del consentimiento (Ley 21.719): qué aceptó y cuándo
      consentimiento: `Aceptó la política de privacidad (versión ${PRIVACIDAD_VERSION}) el ${new Date().toLocaleString("es-CL")}`,
      botcheck: false
    };
    if (d.email.trim()) payload.replyto = d.email.trim();

    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Enviando…";
    status.removeAttribute("data-kind"); status.textContent = "";
    try {
      if (!WEB3FORMS_KEY || WEB3FORMS_KEY.startsWith("__")) throw new Error("Falta la clave de Web3Forms.");
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || "Error " + res.status);
      status.dataset.kind = "ok";
      status.textContent = `¡Gracias, ${payload.nombre.split(" ")[0]}! Recibimos tu mensaje y te respondemos en menos de 24 horas.`;
      form.reset(); track("form_submit_ok", { servicio: d.servicio || "sin" });
    } catch (err) {
      console.warn("[contacto]", err.message);
      status.dataset.kind = "error";
      status.textContent = "";
      const p = document.createElement("span");
      p.textContent = "No pudimos enviar el formulario. Mándanos lo mismo por WhatsApp, ya va escrito: ";
      const a = document.createElement("a");
      a.href = waFallback({ ...payload, rubro: d.rubro ? rubroTxt : "", servicio: d.servicio ? servTxt.toLowerCase() : "", mensaje: d.mensaje.trim() });
      a.target = "_blank"; a.rel = "noopener"; a.textContent = "abrir WhatsApp";
      status.append(p, a, document.createTextNode("."));
      track("form_error", { motivo: err.message.slice(0, 60) });
    } finally {
      btn.disabled = false; btn.textContent = "Enviar mensaje";
    }
  });
})();
