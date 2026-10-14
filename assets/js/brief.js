/* {found} studio · /brief/
   Brief en línea para clientes que aceptaron la propuesta. Llega al correo con Web3Forms.
   Enlace personalizado: /brief/?negocio=Barbería%20Rucahue&nombre=Juan&servicio=tienda
   El borrador se guarda en el navegador del cliente (localStorage) y se borra al enviar.
   Sin JavaScript, el formulario se envía igual a Web3Forms (action + campo access_key). */
(() => {
  "use strict";
  const form = document.getElementById("brief-form");
  if (!form) return;
  const $ = s => document.querySelector(s);
  const status = $("#b-status"), saved = $("#b-saved");
  const { WEB3FORMS_KEY, PRIVACIDAD_VERSION } = window.FOUND;
  const DRAFT = "found-brief-v1";
  const NO_GUARDAR = ["access_key", "botcheck", "consiento"];

  /* El navegador puede bloquear el almacenamiento (modo privado): el brief funciona igual, sin borrador */
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(DRAFT)) || null; } catch (_) { return null; } },
    set(v) { try { localStorage.setItem(DRAFT, JSON.stringify(v)); return true; } catch (_) { return false; } },
    clear() { try { localStorage.removeItem(DRAFT); } catch (_) { /* nada que borrar */ } }
  };

  /* Lee y escribe el formulario como { nombre: valor | [valores] } */
  const controls = () => [...form.elements].filter(el => el.name && !NO_GUARDAR.includes(el.name) && el.type !== "hidden");
  const read = (conOcultos = true) => {
    const out = {};
    controls().filter(el => conOcultos || !el.matches(":disabled")).forEach(el => {
      if (el.type === "checkbox") { if (el.checked) (out[el.name] = out[el.name] || []).push(el.value); }
      else if (el.type === "radio") { if (el.checked) out[el.name] = el.value; }
      else if (el.value.trim()) out[el.name] = el.value;
    });
    return out;
  };
  const write = data => controls().forEach(el => {
    const v = data[el.name];
    if (v == null) return;
    if (el.type === "checkbox") el.checked = [].concat(v).includes(el.value);
    else if (el.type === "radio") el.checked = el.value === v;
    else el.value = String(v).slice(0, el.maxLength > 0 ? el.maxLength : 4000);
  });

  /* Secciones de tienda y sistema: solo si corresponden al proyecto (sin elegir, se muestran las dos) */
  const tipo = form.elements.Proyecto;
  const applyTipo = () => {
    const t = tipo.value;
    document.querySelectorAll("[data-solo]").forEach(el => {
      const show = !t || t === "varios" || t === el.dataset.solo;
      el.hidden = !show;
      if (el.tagName === "FIELDSET") el.disabled = !show;   // lo oculto no se envía
    });
  };

  /* Índice: marca las secciones que ya tienen respuestas */
  const marks = () => {
    form.querySelectorAll(".bsec").forEach(sec => {
      const li = document.querySelector(`.brief-toc a[href="#${sec.id}"]`)?.parentElement;
      if (!li) return;
      const done = [...sec.querySelectorAll("input, select, textarea")].some(el =>
        (el.type === "checkbox" || el.type === "radio") ? el.checked : el.type !== "hidden" && el.value.trim() !== "");
      li.toggleAttribute("data-done", done);
    });
  };

  /* 1. Borrador anterior, o datos del enlace personalizado */
  const draft = store.get();
  const qs = new URLSearchParams(location.search);
  if (draft && Object.keys(draft).length) { write(draft); $("#b-draft").hidden = false; }
  const fromLink = { Negocio: qs.get("negocio"), Nombre: qs.get("nombre") };
  Object.entries(fromLink).forEach(([k, v]) => { const el = form.elements[k]; if (v && el && !el.value) el.value = v.slice(0, 80); });
  const serv = qs.get("servicio");
  if (serv && !tipo.value && [...tipo.options].some(o => o.value === serv)) tipo.value = serv;
  if (form.elements.Negocio.value) $("#b-hola").textContent = `Hola, ${form.elements.Negocio.value.trim()}. Completa lo que puedas; si algo no lo sabes, déjalo en blanco y lo vemos juntos. Lo que escribes se guarda en este dispositivo hasta que lo envíes.`;
  applyTipo(); marks();

  /* 2. Guardado automático */
  let t;
  const save = () => {
    clearTimeout(t);
    t = setTimeout(() => {
      if (store.set(read())) saved.textContent = `Borrador guardado en este dispositivo (${new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}).`;
    }, 500);
  };
  form.addEventListener("input", e => { if (e.target === tipo) applyTipo(); marks(); save(); if (e.target.getAttribute("aria-invalid")) validate(); });
  form.addEventListener("change", e => { if (e.target === tipo) applyTipo(); marks(); save(); if (e.target.getAttribute("aria-invalid")) validate(); });

  $("#b-reset").addEventListener("click", () => {
    if (!confirm("¿Borrar todo lo que escribiste y empezar de cero?")) return;
    store.clear(); form.reset(); applyTipo(); marks();
    $("#b-draft").hidden = true; saved.textContent = "";
    form.elements.Nombre.focus();
  });

  let started = false;
  form.addEventListener("focusin", () => { if (!started) { started = true; track("brief_start"); } });

  /* 3. Validación: nombre, negocio, un medio de contacto y la aceptación */
  const setErr = (el, errId, msg) => {
    $("#" + errId).textContent = msg || "";
    if (msg) { el.setAttribute("aria-invalid", "true"); el.setAttribute("aria-describedby", errId); }
    else { el.removeAttribute("aria-invalid"); el.removeAttribute("aria-describedby"); }
    return !msg;
  };
  const validate = () => {
    const f = form.elements, bad = [];
    const tel = f.WhatsApp.value.trim(), mail = f.Correo.value.trim();
    const telOk = tel.replace(/\D/g, "").length >= 8;
    const mailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail);
    if (!setErr(f.Nombre, "e-b-nombre", f.Nombre.value.trim() ? "" : "Escribe tu nombre.")) bad.push(f.Nombre);
    if (!setErr(f.Negocio, "e-b-negocio", f.Negocio.value.trim() ? "" : "Escribe el nombre de tu negocio.")) bad.push(f.Negocio);
    if (!setErr(f.WhatsApp, "e-b-tel", telOk || mailOk ? "" : "Déjanos un WhatsApp o un correo para responderte.")) bad.push(f.WhatsApp);
    if (!setErr(f.Correo, "e-b-email", !mail || mailOk ? "" : "Revisa el correo: parece incompleto.")) bad.push(f.Correo);
    if (!setErr(f.consiento, "e-b-consent", f.consiento.checked ? "" : "Necesitamos tu aceptación para usar estos datos en tu proyecto.")) bad.push(f.consiento);
    return bad;
  };

  /* 4. Envío: una línea por pregunta respondida, en el orden del brief */
  const toText = data => Object.entries(data).map(([k, v]) => `${k}: ${[].concat(v).join(", ")}`).join("\n");

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (form.elements.botcheck.checked) return; // trampa anti-spam
    const bad = validate();
    if (bad.length) { bad[0].focus(); status.removeAttribute("data-kind"); status.textContent = ""; return; }

    const data = read(false);   // sin las secciones ocultas
    data.Proyecto = tipo.value ? tipo.selectedOptions[0].textContent : "Aún no está claro";
    const negocio = data.Negocio.trim();
    const payload = {
      access_key: WEB3FORMS_KEY,
      subject: `Brief: ${negocio}`,
      from_name: "foundstudio.cl/brief",
      ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, [].concat(v).join(", ").trim()])),
      // registro del consentimiento (Ley 21.719): qué aceptó y cuándo
      consentimiento: `Aceptó la política de privacidad (versión ${PRIVACIDAD_VERSION}) el ${new Date().toLocaleString("es-CL")}`,
      botcheck: false
    };
    if (data.Correo) payload.replyto = data.Correo.trim();

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
      store.clear(); clearTimeout(t);
      status.dataset.kind = "ok";
      status.textContent = `¡Listo, ${data.Nombre.trim().split(" ")[0]}! Recibimos el brief de ${negocio}. Te escribimos para mostrarte el primer diseño.`;
      if (!data["Enlace a fotos y logo"]) {
        const a = document.createElement("a");
        a.className = "btn"; a.target = "_blank"; a.rel = "noopener";
        a.href = waLink(`Hola {found}, soy ${data.Nombre.trim()} de ${negocio}. Ya envié el brief; te mando el logo y las fotos.`);
        a.textContent = "Mandar logo y fotos por WhatsApp";
        status.append(document.createElement("br"), a);
      }
      form.reset(); applyTipo(); marks(); saved.textContent = ""; $("#b-draft").hidden = true;
      track("brief_submit_ok", { proyecto: tipo.value || "sin" });
    } catch (err) {
      console.warn("[brief]", err.message);
      status.dataset.kind = "error";
      status.textContent = "";
      const p = document.createElement("span");
      p.textContent = "No pudimos enviar el brief. No se perdió nada: sigue guardado en este dispositivo. Intenta de nuevo en un rato, o copia tus respuestas y mándalas por WhatsApp.";
      const copy = document.createElement("button");
      copy.type = "button"; copy.className = "btn btn-ghost"; copy.textContent = "Copiar mis respuestas";
      copy.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(`Brief de ${negocio}\n\n${toText(data)}`); copy.textContent = "Copiado"; }
        catch (_) { copy.textContent = "No se pudo copiar"; }
      });
      const a = document.createElement("a");
      a.className = "btn"; a.target = "_blank"; a.rel = "noopener"; a.textContent = "Abrir WhatsApp";
      a.href = waLink(`Hola {found}, soy ${data.Nombre.trim()} de ${negocio}. No pude enviar el brief desde la página; te lo pego aquí:`);
      status.append(p, document.createElement("br"), copy, document.createTextNode(" "), a);
      track("brief_error", { motivo: err.message.slice(0, 60) });
    } finally {
      btn.disabled = false; btn.textContent = "Enviar brief";
    }
  });
})();
