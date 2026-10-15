/* {found} studio · sesión compartida por /mi-proyecto/ y /panel/
   Entrada con correo y contraseña, o con un enlace al correo (Supabase Auth, correo enviado por Resend).
   La primera vez se entra con el enlace y ahí se crea la contraseña, para no gastar correos en cada entrada.
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

    // global: cierra la sesión en todos los dispositivos (invalida todos los accesos de la cuenta)
    async salir(global = false) { await this.db().auth.signOut({ scope: global ? "global" : "local" }); location.replace(location.pathname); },

    /* Perfil: nombre, contraseña, apariencia (tema.js) y sesiones. Se arma dentro de `cont`.
       pre: prefijo de los id ("a" en el panel, "p" en el portal) · notaCorreo: cómo se cambia el correo */
    montarPerfil(cont, user, { pre, notaCorreo }) {
      const meta = user.user_metadata || {};
      // la preferencia guardada en la cuenta sigue a la persona en cualquier dispositivo
      if (window.tema && tema.OPCIONES.includes(meta.tema) && meta.tema !== tema.actual()) tema.poner(meta.tema);
      const st = () => el("p", { class: "status", role: "status", "aria-live": "polite" });
      const msg = (s, kind, texto) => { if (kind) s.dataset.kind = kind; else s.removeAttribute("data-kind"); s.textContent = texto; };

      // datos
      const fDatos = el("form", { novalidate: true },
        el("div", { class: "field" }, el("label", { for: pre + "-nombre" }, "Tu nombre"), el("input", { id: pre + "-nombre", name: "nombre", maxlength: "80", autocomplete: "name", value: meta.nombre || "" })),
        el("div", { class: "field" }, el("label", { for: pre + "-correo" }, "Correo"), el("input", { id: pre + "-correo", type: "email", value: user.email || "", readonly: true, autocomplete: "username" })),
        el("p", { class: "soft perfil-nota" }, notaCorreo),
        el("button", { class: "btn btn-sm", type: "submit" }, "Guardar nombre"), st());
      fDatos.addEventListener("submit", async e => {
        e.preventDefault();
        const s = fDatos.querySelector(".status"), nombre = fDatos.nombre.value.trim();
        if (!nombre) { msg(s, "error", "Escribe tu nombre."); return; }
        const { error } = await this.db().auth.updateUser({ data: { nombre } });
        error ? msg(s, "error", "No se pudo guardar: " + error.message) : msg(s, "ok", "Nombre guardado.");
      });

      // contraseña
      const fClave = el("form", { id: pre + "-clave-form", novalidate: true },
        el("p", { class: "soft perfil-nota" }, "Con contraseña entras con tu correo, sin esperar un enlace. Si la olvidas, pide un enlace en la entrada y créala de nuevo aquí."),
        el("div", { class: "row-2" },
          el("div", { class: "field" }, el("label", { for: pre + "-clave1" }, "Contraseña nueva"), el("input", { id: pre + "-clave1", type: "password", autocomplete: "new-password", minlength: "8", maxlength: "72", required: true })),
          el("div", { class: "field" }, el("label", { for: pre + "-clave2" }, "Repítela"), el("input", { id: pre + "-clave2", type: "password", autocomplete: "new-password", minlength: "8", maxlength: "72", required: true }))),
        el("button", { class: "btn btn-sm", type: "submit" }, "Guardar contraseña"), st());
      this.montarClave(fClave);

      // apariencia
      const sTema = st();
      const opcion = (valor, titulo, detalle) => el("label", { class: "tema-op" },
        el("input", { type: "radio", name: pre + "-tema", value: valor, checked: window.tema?.actual() === valor, onchange: async () => {
          tema.poner(valor);
          const { error } = await this.db().auth.updateUser({ data: { tema: valor } });
          error ? msg(sTema, "error", "Se aplicó aquí, pero no se guardó en tu cuenta.") : msg(sTema, null, "");
        } }),
        el("span", { class: `tema-muestra tema-${valor}`, "aria-hidden": "true" }),
        el("span", { class: "tema-txt" }, el("b", {}, titulo), el("small", {}, detalle)));
      const apariencia = el("fieldset", { class: "temas" }, el("legend", { class: "sr" }, "Tema"),
        opcion("oscuro", "Oscuro", "El de la marca"), opcion("claro", "Claro", "Fondo crema"), opcion("auto", "Automático", "Igual que tu dispositivo"));

      // sesiones
      let confirmando;
      const todos = el("button", { class: "btn btn-sm btn-ghost btn-peligro", type: "button", onclick: () => {
        if (confirmando) return this.salir(true);
        confirmando = setTimeout(() => { confirmando = null; todos.textContent = "Cerrar sesión en todos los dispositivos"; }, 5000);
        todos.textContent = "¿Seguro? Toca otra vez";
      } }, "Cerrar sesión en todos los dispositivos");
      const sesiones = el("div", {},
        el("dl", { class: "perfil-datos" },
          user.last_sign_in_at ? el("div", {}, el("dt", {}, "Último ingreso"), el("dd", {}, fecha(user.last_sign_in_at, true))) : null,
          user.created_at ? el("div", {}, el("dt", {}, "Cuenta desde"), el("dd", {}, fecha(user.created_at))) : null),
        el("p", { class: "soft perfil-nota" }, "Si entraste desde un computador que no es tuyo, cierra la sesión en todos lados: tendrás que volver a entrar en cada dispositivo."),
        el("div", { class: "btns" }, el("button", { class: "btn btn-sm btn-ghost", type: "button", onclick: () => this.salir() }, "Cerrar sesión"), todos));

      const tarjeta = (titulo, ...hijos) => el("section", { class: "card perfil-card" }, el("h2", {}, titulo), ...hijos);
      cont.replaceChildren(
        tarjeta("Tus datos", fDatos),
        tarjeta("Contraseña", fClave),
        tarjeta("Apariencia", apariencia, sTema),
        tarjeta("Sesión", sesiones));
    },

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

    /* Formulario de entrada: <form> con input[type=email], input[type=password] opcional, botón submit,
       botón [data-enlace] opcional y un .status. Con contraseña entra directo (no gasta correos);
       sin contraseña, o con [data-enlace], manda el enlace al correo. */
    montarEntrada(form, { alEnviar } = {}) {
      const input = form.querySelector("input[type=email]"), clave = form.querySelector("input[type=password]");
      const btn = form.querySelector("button[type=submit]"), btnEnlace = form.querySelector("[data-enlace]"), st = form.querySelector(".status");
      const pre = new URLSearchParams(location.search).get("email");
      if (pre) input.value = pre.slice(0, 120);
      const leerCorreo = () => {
        const email = input.value.trim().toLowerCase();
        st.removeAttribute("data-kind");
        if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return email;
        st.dataset.kind = "error"; st.textContent = "Revisa el correo: parece incompleto."; input.focus(); return null;
      };
      form.addEventListener("submit", async e => {
        e.preventDefault();
        if (!clave || !clave.value) return enviarEnlace(btn);
        const email = leerCorreo(); if (!email) return;
        const txt = btn.textContent; btn.disabled = true; btn.textContent = "Entrando…"; st.textContent = "";
        const { error } = await this.db().auth.signInWithPassword({ email, password: clave.value });
        btn.disabled = false; btn.textContent = txt;
        if (!error) return location.reload();
        st.dataset.kind = "error";
        st.textContent = /invalid|credentials/i.test(error.message)
          ? "Correo o contraseña incorrectos. Si todavía no creas una contraseña, pide un enlace al correo."
          : /rate|many/i.test(error.message) ? "Demasiados intentos. Espera un minuto y vuelve a intentarlo."
            : "No pudimos entrar. Intenta de nuevo en un rato.";
      });
      btnEnlace && btnEnlace.addEventListener("click", () => enviarEnlace(btnEnlace));
      const enviarEnlace = async boton => {
        const email = leerCorreo(); if (!email) return;
        const txt = boton.textContent; boton.disabled = true; boton.textContent = "Enviando…"; st.textContent = "";
        const { error } = await this.db().auth.signInWithOtp({
          email, options: { shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname }
        });
        boton.disabled = false; boton.textContent = txt;
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
      };
    },

    /* Crear o cambiar la contraseña de la cuenta con la sesión abierta.
       <form> con dos input[type=password], un botón y un .status */
    montarClave(form) {
      const [c1, c2] = form.querySelectorAll("input[type=password]"), btn = form.querySelector("button[type=submit]"), st = form.querySelector(".status");
      form.addEventListener("submit", async e => {
        e.preventDefault();
        st.removeAttribute("data-kind");
        const fallo = msg => { st.dataset.kind = "error"; st.textContent = msg; };
        if (c1.value.length < 8) { c1.focus(); return fallo("La contraseña necesita al menos 8 caracteres."); }
        if (c1.value !== c2.value) { c2.focus(); return fallo("Las dos contraseñas no coinciden."); }
        btn.disabled = true; st.textContent = "Guardando…";
        const { error } = await this.db().auth.updateUser({ password: c1.value });
        btn.disabled = false;
        if (error) {
          return fallo(/same|different/i.test(error.message) ? "Esa ya es tu contraseña actual."
            : /weak|short|characters/i.test(error.message) ? "Esa contraseña es muy débil. Prueba una más larga."
              : /reauth|recent/i.test(error.message) ? "Por seguridad, sal, entra con un enlace nuevo y vuelve a intentarlo."
                : "No se pudo guardar: " + error.message);
        }
        form.reset();
        st.dataset.kind = "ok"; st.textContent = "Contraseña guardada. La próxima vez entra con tu correo y esta contraseña, sin esperar el correo.";
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
