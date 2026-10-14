/* {found} studio · sesión compartida por /mi-proyecto/ y /panel/
   Entrada sin contraseña: la persona escribe su correo y le llega un enlace (Supabase Auth, correo enviado por Resend).
   Solo pueden entrar correos que ya tienen cuenta: las cuentas las crea el estudio al aceptar una propuesta. */
(() => {
  "use strict";
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.FOUND;
  let cliente = null;

  window.sesion = {
    activo: () => !!(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase),

    db() {
      if (!cliente) cliente = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      return cliente;
    },

    async usuario() {
      const { data } = await this.db().auth.getSession();
      return data.session?.user || null;
    },

    async salir() { await this.db().auth.signOut(); location.replace(location.pathname); },

    /* Llama a la función del servidor; devuelve los datos o lanza un Error con un mensaje legible */
    async funcion(accion, datos = {}) {
      const { data, error } = await this.db().functions.invoke("found", { body: { accion, ...datos } });
      if (error) {
        let msg = error.message;
        try { msg = (await error.context.json()).error || msg; } catch (_) { /* sin cuerpo */ }
        throw new Error(msg);
      }
      return data;
    },

    /* Formulario de entrada: <form> con un input[type=email], un botón y un .status */
    montarEntrada(form, { alEnviar } = {}) {
      const input = form.querySelector("input[type=email]"), btn = form.querySelector("button"), st = form.querySelector(".status");
      const pre = new URLSearchParams(location.search).get("email");
      if (pre) input.value = pre.slice(0, 120);
      form.addEventListener("submit", async e => {
        e.preventDefault();
        const email = input.value.trim().toLowerCase();
        st.removeAttribute("data-kind");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
          st.dataset.kind = "error"; st.textContent = "Revisa el correo: parece incompleto."; input.focus(); return;
        }
        btn.disabled = true; btn.textContent = "Enviando…"; st.textContent = "";
        const { error } = await this.db().auth.signInWithOtp({
          email, options: { shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname }
        });
        btn.disabled = false; btn.textContent = "Enviarme el enlace";
        if (error) {
          st.dataset.kind = "error";
          st.textContent = /signup|not allowed|not found|otp/i.test(error.message)
            ? "Ese correo no tiene un proyecto con nosotros. Si crees que es un error, escríbenos por WhatsApp."
            : /rate|seconds|many/i.test(error.message)
              ? "Ya te enviamos un enlace hace poco. Espera un minuto y vuelve a intentarlo."
              : "No pudimos enviar el enlace. Intenta de nuevo en un rato.";
          return;
        }
        st.dataset.kind = "ok";
        st.textContent = `Listo. Te enviamos un enlace a ${email}. Ábrelo desde este mismo dispositivo (revisa también la carpeta de spam).`;
        alEnviar && alEnviar(email);
      });
    }
  };

  /* Utilidades de interfaz para portal y panel: todo texto entra como texto, nunca como HTML */
  window.el = (tag, attrs = {}, ...hijos) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else if (k in n && typeof v !== "string") n[k] = v;
      else n.setAttribute(k, v === true ? "" : v);
    }
    hijos.flat().forEach(h => h != null && h !== false && n.append(h instanceof Node ? h : String(h)));
    return n;
  };
  window.fecha = (iso, conHora = false) => iso ? new Date(iso).toLocaleDateString("es-CL", conHora
    ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "long", year: "numeric" }) : "";
  window.ESTADOS = [
    ["aceptada", "Propuesta aceptada"], ["brief", "Brief"], ["diseno", "Diseño"], ["revision", "Revisión"], ["publicado", "Publicado"]
  ];
})();
