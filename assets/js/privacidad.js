/* {found} studio · privacidad.html
   Solicitudes de derechos ARCO+: arma un correo listo para enviar.
   No envía nada por su cuenta ni guarda datos: el usuario lo envía desde su propio correo. */

(() => {
  "use strict";

  const CORREO = "contacto@foundstudio.cl";
  const form = document.getElementById("arco");
  if (!form) return;
  const status = document.getElementById("a-status");

  const MSG = {
    nombre: "Escribe tu nombre.",
    email: "Escribe el correo con el que nos contactaste.",
    derecho: "Elige qué quieres pedir."
  };

  function check(f) {
    const el = document.getElementById("ea-" + f.name);
    if (!el) return true;
    let msg = "";
    if (!f.value.trim()) msg = MSG[f.name];
    else if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.value.trim())) msg = "Revisa el correo: parece incompleto.";
    el.textContent = msg;
    if (msg) { f.setAttribute("aria-invalid", "true"); f.setAttribute("aria-describedby", el.id); }
    else f.removeAttribute("aria-invalid");
    return !msg;
  }

  const fields = [...form.querySelectorAll("[required]")];
  fields.forEach(f => {
    f.addEventListener("input", () => { if (f.getAttribute("aria-invalid")) check(f); });
    f.addEventListener("change", () => { if (f.getAttribute("aria-invalid")) check(f); });
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    const bad = fields.filter(f => !check(f));
    if (bad.length) { bad[0].focus(); return; }

    const d = Object.fromEntries(new FormData(form));
    const asunto = `Solicitud de derechos sobre datos personales: ${d.derecho}`;
    const cuerpo = [
      "Hola {found} studio:",
      "",
      `Quiero ejercer mi derecho de: ${d.derecho}.`,
      "",
      `Nombre: ${d.nombre.trim()}`,
      `Correo con el que los contacté: ${d.email.trim()}`,
      d.detalle && d.detalle.trim() ? `Detalle: ${d.detalle.trim()}` : "",
      "",
      "Gracias."
    ].filter((l, i, a) => l || a[i - 1]).join("\n");

    location.href = `mailto:${CORREO}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    status.textContent = "";
    status.append("Se abrió tu correo con la solicitud. Si no se abrió, escríbenos directo a ");
    const a = document.createElement("a");
    a.href = "mailto:" + CORREO;
    a.textContent = CORREO;
    status.append(a, ".");
  });
})();
