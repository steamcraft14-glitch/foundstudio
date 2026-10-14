/* {found} studio · foundstudio.cl */

// ── Configuración ─────────────────────────────────────────
// Clave de acceso de Web3Forms (https://web3forms.com). Pega aquí la tuya.
const WEB3FORMS_KEY = "PEGAR_AQUI";
// Número de WhatsApp de la agencia, sin + ni espacios.
const WHATSAPP = "56942579133";
// Fecha de la política de privacidad vigente (privacidad.html). Cámbiala si cambias la política.
const PRIVACIDAD_VERSION = "2026-10-09";
// ──────────────────────────────────────────────────────────

(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clp = new Intl.NumberFormat("es-CL");

  $("#year").textContent = new Date().getFullYear();

  /* ── WhatsApp ─────────────────────────────────────────── */
  const RUBRO_FRASE = {
    "restaurante": "un restaurante",
    "barbería": "una barbería",
    "almacén": "un almacén",
    "eventos": "una empresa de eventos",
    "construcción": "una empresa de construcción",
    "botillería": "una botillería"
  };
  function waUrl(rubro) {
    const frase = RUBRO_FRASE[rubro];
    const msg = frase
      ? `Hola {found}, tengo ${frase} y quiero cotizar`
      : "Hola {found}, quiero cotizar para mi negocio";
    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
  }
  const waLinks = ["#wa-inline", "#wa-fab", "#wa-foot"].map(s => $(s)).filter(Boolean);
  const setWa = rubro => waLinks.forEach(a => { a.href = waUrl(rubro); });
  setWa("");

  /* ── Rubro preseleccionado ────────────────────────────── */
  const rubroSel = $("#f-rubro");
  const CHAPTER_RUBRO = [null, "restaurante", "barbería", "almacén", "botillería", "eventos", "construcción", null];
  const CHAPTER_SERV = [null, "web", "web", "tienda", "software", "web", "web", null];
  const SERVICIO = { web: "página web", tienda: "tienda online", software: "software / inventario", marketing: "marketing digital", ia: "automatización con IA" };
  const servSel = $("#f-servicio");
  const chooseServ = k => { if (k && SERVICIO[k]) servSel.value = SERVICIO[k]; };
  let currentChapter = 0;

  function chooseRubro(rubro) {
    if (!rubro) return;
    rubroSel.value = rubro;
    rubroSel.dispatchEvent(new Event("change", { bubbles: true }));
  }
  rubroSel.addEventListener("change", () => {
    setWa(rubroSel.value);
    clearError(rubroSel);
  });
  function focusFormIfKeyboard(e) {
    // Solo con teclado: en celular no abrimos el teclado de golpe.
    if (e.detail === 0) setTimeout(() => $("#f-nombre").focus({ preventScroll: true }), 450);
  }
  // Todo lo que dice "cotizar" lleva al formulario con el rubro y el servicio ya elegidos.
  $$("[data-rubro], [data-servicio]").forEach(a => a.addEventListener("click", e => {
    chooseRubro(a.dataset.rubro);
    chooseServ(a.dataset.servicio);
    focusFormIfKeyboard(e);
  }));
  $$("[data-cta]").forEach(a => a.addEventListener("click", e => {
    // desde un ejemplo: dejamos ese rubro y servicio elegidos si aún no hay uno
    const r = CHAPTER_RUBRO[currentChapter];
    if (r && !rubroSel.value) chooseRubro(r);
    chooseServ(CHAPTER_SERV[currentChapter]);
    focusFormIfKeyboard(e);
  }));

  /* ── Tu negocio: el nombre que escribes aparece en la URL, en el final y en el formulario ── */
  const biz = $("#biz"), s404 = $(".s404"), s404h = $("#s404h"), s404p = $("#s404p");
  const finalH = $("#final-h"), youH = $("#you-h"), negocio = $("#f-negocio");
  const skin0 = $(".skin"), skinYou = $(".skin-you");
  const P404 = s404p.textContent;
  const slug = t => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, "y").replace(/[^a-z0-9]+/g, "");
  let bizName = "";
  function setBiz(raw) {
    bizName = raw.trim().replace(/\s+/g, " ").slice(0, 36);
    const domain = (slug(bizName) || "tunegocio").slice(0, 28) + ".cl";
    skin0.dataset.url = domain;
    skinYou.dataset.url = domain;
    s404.classList.toggle("has-name", !!bizName);
    s404h.textContent = bizName ? `“${bizName}” no aparece` : "Tu negocio no aparece";
    s404p.textContent = bizName ? "Así te ve hoy quien te busca. Baja y mira cómo podría verse." : P404;
    finalH.textContent = bizName ? `¿Y ${bizName}?` : "¿Y tu negocio?";
    youH.textContent = bizName ? `${bizName}, ¿qué necesitas?` : "¿Cuál es tu negocio?";
    if (!negocio.dataset.touched) negocio.value = bizName;
    if (currentChapter === 0 && window.__found) window.__found.showUrl(domain);
  }
  biz.addEventListener("input", () => setBiz(biz.value));
  $("#namer").addEventListener("submit", e => {
    e.preventDefault();
    biz.blur();
    if (window.__found) window.__found.goTo(1);
  });

  /* ── Portafolio: carpetas que abren el sitio del cliente ── */
  // Mientras el href diga LINK_PENDIENTE, la carpeta no es un enlace (no se puede abrir ni enfocar).
  $$("[data-folder]").forEach(f => {
    const href = f.getAttribute("href") || "";
    if (href.startsWith("#")) return; // enlace interno (carpeta "Próximamente")
    if (!/^https?:\/\//.test(href)) {
      // sin link real no es un enlace: se reemplaza por un bloque normal (Google no ve un enlace roto)
      const d = document.createElement("div");
      d.className = f.className + " is-pending";
      d.innerHTML = f.innerHTML;
      f.replaceWith(d);
    } else {
      // el nombre accesible es el texto visible; solo avisamos que abre otra pestaña
      f.querySelector(".folder-cta").insertAdjacentHTML("beforeend", '<span class="sr"> (abre en una pestaña nueva)</span>');
    }
  });

  /* ── Restaurante: carta por pestañas y reserva ─────────── */
  const tabs = $$(".rest-tabs [role=tab]");
  tabs.forEach(t => t.addEventListener("click", () => {
    tabs.forEach(x => x.setAttribute("aria-selected", x === t));
    $$(".rest-menu [data-panel]").forEach(ul => { ul.hidden = ul.dataset.panel !== t.dataset.tab; });
  }));
  let pax = 2;
  $$("[data-pax]").forEach(b => b.addEventListener("click", () => {
    pax = Math.min(12, Math.max(1, pax + Number(b.dataset.pax)));
    $("#pax").textContent = pax;
  }));
  const hourBtns = $$(".rest-hours-pick button");
  hourBtns.forEach(b => b.addEventListener("click", () => hourBtns.forEach(x => x.setAttribute("aria-pressed", x === b))));
  $("#rest-go").addEventListener("click", () => {
    const h = hourBtns.find(x => x.getAttribute("aria-pressed") === "true");
    $("#rest-ok").textContent = h
      ? `¡Mesa reservada! ${pax} ${pax === 1 ? "persona" : "personas"} a las ${h.textContent}.`
      : "Elige una hora para reservar.";
  });

  /* ── Botillería: inventario y caja ──────────────────────── */
  const boti = {
    sales: 184300, tickets: 57,
    rows: $$(".boti-row[data-name]"),
    salesEl: $("#boti-sales"), ticketsEl: $("#boti-tickets"), lowEl: $("#boti-low"), warn: $("#boti-warn"),
    alert: $("#boti-alert"), alertT: $("#boti-alert-t"), now: $("#boti-now"), toast: $("#boti-toast"), nowH: 38, t: 0
  };
  const botiToast = msg => {
    boti.toast.textContent = msg; boti.toast.classList.add("show");
    clearTimeout(boti.t); boti.t = setTimeout(() => boti.toast.classList.remove("show"), 1900);
  };
  const flash = row => { row.classList.remove("is-flash"); void row.offsetWidth; row.classList.add("is-flash"); setTimeout(() => row.classList.remove("is-flash"), 600); };
  function botiRefresh() {
    const low = [];
    boti.rows.forEach(r => {
      const n = Number($(".stk", r).textContent);
      r.classList.toggle("is-low", n > 0 && n < 6);
      r.classList.toggle("is-out", n === 0);
      $(".sell", r).disabled = n === 0;
      if (n < 6) low.push(r.dataset.name.split(" ").slice(0, 2).join(" "));
    });
    boti.lowEl.textContent = low.length;
    boti.warn.classList.toggle("is-alert", low.length > 0);
    boti.alert.classList.toggle("is-ok", low.length === 0);
    boti.alertT.textContent = low.length === 0
      ? "Todo el inventario con stock suficiente."
      : low.length === 1 ? `${low[0]} está por agotarse.` : `${low.slice(0, -1).join(", ")} y ${low.at(-1)} están por agotarse.`;
  }
  boti.rows.forEach(r => {
    const stk = $(".stk", r);
    $(".sell", r).addEventListener("click", () => {
      const n = Number(stk.textContent); if (n <= 0) return;
      stk.textContent = n - 1;
      boti.sales += Number(r.dataset.price); boti.tickets += 1;
      boti.salesEl.textContent = "$" + clp.format(boti.sales);
      boti.ticketsEl.textContent = boti.tickets;
      boti.nowH = Math.min(96, boti.nowH + 6); boti.now.style.setProperty("--h", boti.nowH + "%");
      flash(r); botiRefresh();
      botiToast(n - 1 === 0 ? `Se agotó: ${r.dataset.name}` : `Venta: ${r.dataset.name} · $${clp.format(Number(r.dataset.price))}`);
    });
    $(".restock", r).addEventListener("click", () => {
      stk.textContent = Number(stk.textContent) + 12;
      flash(r); botiRefresh();
      botiToast(`Repuesto: +12 ${r.dataset.name}`);
    });
  });
  $("#boti-order").addEventListener("click", () => botiToast("Pedido enviado al proveedor por WhatsApp"));
  botiRefresh();

  /* ── Banquetería: cotizador ─────────────────────────────── */
  const evtType = $$(".evt-type button"), guests = $("#evt-guests");
  const evtCalc = () => {
    const pp = Number(evtType.find(b => b.getAttribute("aria-pressed") === "true").dataset.pp);
    $("#evt-n").textContent = guests.value;
    $("#evt-total").textContent = "$" + clp.format(pp * Number(guests.value));
  };
  evtType.forEach(b => b.addEventListener("click", () => { evtType.forEach(x => x.setAttribute("aria-pressed", x === b)); evtCalc(); }));
  guests.addEventListener("input", evtCalc);
  $("#evt-go").addEventListener("click", () => {
    $("#evt-ok").textContent = `¡Listo! Cotización para ${guests.value} invitados enviada por WhatsApp.`;
  });
  evtCalc();

  /* ── Construcción: calculadora por m² ───────────────────── */
  const conKind = $$(".con-kind button"), m2 = $("#con-m2");
  const conCalc = () => {
    const v = Number(conKind.find(b => b.getAttribute("aria-pressed") === "true").dataset.m2);
    $("#con-n").textContent = m2.value;
    $("#con-total").textContent = "$" + clp.format(v * Number(m2.value));
  };
  conKind.forEach(b => b.addEventListener("click", () => { conKind.forEach(x => x.setAttribute("aria-pressed", x === b)); conCalc(); }));
  m2.addEventListener("input", conCalc);
  $("#con-go").addEventListener("click", () => {
    $("#con-ok").textContent = `Visita técnica solicitada para ${m2.value} m². Te llamamos hoy.`;
  });
  conCalc();

  /* ── Editor de código: se escribe al aparecer ───────────── */
  const editor = $(".editor");
  $$(".editor .ln, .editor .editor-out").forEach((el, i) => el.style.setProperty("--i", i));
  if (reduce || !("IntersectionObserver" in window)) editor.classList.add("is-run");
  else new IntersectionObserver((en, ob) => {
    if (en[0].isIntersecting) { editor.classList.add("is-run"); ob.disconnect(); }
  }, { threshold: 0.35 }).observe(editor);

  /* ── Botones con imán (solo con mouse y con movimiento) ── */
  if (!reduce && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    $$(".btn-cream").forEach(b => {
      b.classList.add("is-magnet");
      b.addEventListener("mousemove", e => {
        const r = b.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) / r.width, y = (e.clientY - r.top - r.height / 2) / r.height;
        b.style.transform = `translate(${(x * 10).toFixed(1)}px, ${(y * 8).toFixed(1)}px)`;
      });
      b.addEventListener("mouseleave", () => { b.style.transform = ""; });
    });
  }

  /* ── Barbería: elegir día y hora ──────────────────────── */
  const HORAS = ["10:00", "10:45", "11:30", "12:15", "13:00", "15:30", "16:15"];
  const OCUPADAS = { "Hoy": [0, 1, 3, 4], "Mañana": [2, 5], "Sábado": [0, 1, 2, 5] };
  const slots = $("#slots"), agendar = $("#agendar"), barbOk = $("#barb-ok");
  let dia = "Hoy";
  function renderSlots() {
    slots.innerHTML = HORAS.map((h, i) => {
      const off = OCUPADAS[dia].includes(i);
      return `<button type="button" aria-pressed="false"${off ? ' disabled aria-label="' + h + ', ocupada"' : ""}>${h}</button>`;
    }).join("");
    agendar.disabled = true;
    agendar.textContent = "Elige una hora";
  }
  $$(".barb-days button").forEach(b => b.addEventListener("click", () => {
    $$(".barb-days button").forEach(x => { x.classList.toggle("is-sel", x === b); x.setAttribute("aria-pressed", x === b); });
    dia = b.dataset.day;
    barbOk.textContent = "";
    renderSlots();
  }));
  slots.addEventListener("click", e => {
    const b = e.target.closest("button:not([disabled])");
    if (!b) return;
    $$("button", slots).forEach(x => { x.classList.toggle("is-sel", x === b); x.setAttribute("aria-pressed", x === b); });
    agendar.disabled = false;
    agendar.textContent = `Agendar ${dia.toLowerCase()} a las ${b.textContent}`;
    barbOk.textContent = "";
  });
  agendar.addEventListener("click", () => {
    const sel = $(".is-sel", slots);
    if (!sel) return;
    barbOk.textContent = `¡Listo! Hora reservada: ${dia.toLowerCase()} a las ${sel.textContent}. Te llega un recordatorio por WhatsApp.`;
    sel.disabled = true;
    sel.classList.remove("is-sel");
    agendar.disabled = true;
    agendar.textContent = "Hora reservada";
  });
  renderSlots();

  /* ── Almacén: carro ───────────────────────────────────── */
  const FREE = 15000;
  const cart = $("#cart"), cartn = $("#cartn"), meter = $("#meter"), meterT = $("#meter-t"), toast = $("#toast");
  let count = 0, total = 0, toastTimer;
  $$(".add").forEach(b => b.addEventListener("click", () => {
    count += 1;
    total += Number(b.dataset.price);
    cartn.textContent = count;
    meter.style.transform = `scaleX(${Math.min(1, total / FREE)})`;
    meterT.textContent = total >= FREE
      ? "¡Tienes despacho gratis!"
      : `Te faltan $${clp.format(FREE - total)} para el despacho gratis`;
    cart.classList.remove("bump"); void cart.offsetWidth; cart.classList.add("bump");
    toast.textContent = `${b.dataset.name} al carro · Total $${clp.format(total)}`;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
  }));

  /* ── Formulario (Web3Forms) ───────────────────────────── */
  const form = $("#form"), send = $("#f-send"), status = $("#f-status");
  const MSG = {
    nombre: { valueMissing: "Escribe tu nombre." },
    negocio: { valueMissing: "Escribe el nombre de tu negocio." },
    rubro: { valueMissing: "Elige un rubro (o “Otro”)." },
    email: { valueMissing: "Escribe tu correo para poder responderte.", typeMismatch: "Revisa el correo: parece incompleto." },
    telefono: { custom: "Revisa el teléfono: debe tener al menos 8 dígitos." },
    acepto: { valueMissing: "Necesitamos tu autorización para usar tus datos y responderte." }
  };
  const errEl = f => $("#e-" + f.name);
  function clearError(f) {
    const el = errEl(f); if (!el) return;
    el.textContent = ""; f.removeAttribute("aria-invalid");
  }
  function check(f) {
    const m = MSG[f.name]; if (!m) return true;
    let msg = "";
    if (f.name === "telefono") {
      const digits = f.value.replace(/\D/g, "");
      if (f.value.trim() && digits.length < 8) msg = m.custom;
    } else if (f.validity.valueMissing || !f.value.trim()) {
      // incluye la casilla de consentimiento: sin marcar, no se envía nada
      if (f.required) msg = m.valueMissing;
    } else if (f.validity.typeMismatch || (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.value.trim()))) {
      msg = m.typeMismatch;
    }
    const el = errEl(f);
    if (msg) {
      el.textContent = msg; f.setAttribute("aria-invalid", "true"); f.setAttribute("aria-describedby", el.id);
      return false;
    }
    clearError(f);
    return true;
  }
  const fields = $$("input:not([type=hidden]):not(.botcheck), select, textarea", form);
  fields.forEach(f => {
    f.addEventListener("blur", () => { if (f.dataset.touched) check(f); });
    f.addEventListener("input", () => { f.dataset.touched = "1"; if (f.getAttribute("aria-invalid")) check(f); });
    f.addEventListener("change", () => { f.dataset.touched = "1"; });
  });

  function setStatus(kind, html) {
    status.className = "status" + (kind ? " is-" + kind : "");
    status.innerHTML = html;
  }
  const FAIL = 'No se pudo enviar. Escríbenos a <a href="mailto:contacto@foundstudio.cl">contacto@foundstudio.cl</a>';

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (form.botcheck.checked) return; // trampa anti-spam
    const bad = fields.filter(f => !check(f));
    if (bad.length) { bad[0].focus(); setStatus("", ""); return; }

    const data = Object.fromEntries(new FormData(form));
    delete data.botcheck;
    delete data.acepto;
    const payload = {
      ...data,
      // registro del consentimiento (Ley 21.719): qué aceptó y cuándo
      consentimiento: `Aceptó la política de privacidad (versión ${PRIVACIDAD_VERSION}) el ${new Date().toLocaleString("es-CL")}`,
      access_key: WEB3FORMS_KEY,
      subject: `Nuevo contacto web: ${data.negocio.trim()}`,
      name: data.nombre,
      botcheck: false
    };

    send.disabled = true;
    setStatus("", "Enviando...");
    try {
      if (!WEB3FORMS_KEY || WEB3FORMS_KEY === "PEGAR_AQUI") throw new Error("Falta la clave de Web3Forms (WEB3FORMS_KEY).");
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal
      });
      clearTimeout(t);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "HTTP " + res.status);
      setStatus("ok", "¡Listo! Te respondemos en menos de 24 horas");
      form.reset();
      fields.forEach(f => { delete f.dataset.touched; clearError(f); });
      setWa("");
    } catch (err) {
      console.warn("[contacto]", err.message);
      setStatus("err", FAIL);
    } finally {
      send.disabled = false;
    }
  });

  /* ── Botón flotante y riel ────────────────────────────── */
  const story = $("#story"), fab = $("#wa-fab"), rail = $("#rail"), contact = $("#contacto");
  let contactVisible = false;
  new IntersectionObserver(([en]) => { contactVisible = en.isIntersecting; chrome(); }, { threshold: 0.12 }).observe(contact);
  // En celular el botón no tapa lo que estás leyendo: se esconde mientras bajas
  // y vuelve cuando subes o te detienes un momento.
  let lastY = scrollY, readingDown = false, idleT;
  function chrome() {
    const r = story.getBoundingClientRect();
    const inStory = r.bottom > innerHeight * 0.6;
    const narrow = innerWidth < 860;
    if (Math.abs(scrollY - lastY) > 4) { readingDown = scrollY > lastY; lastY = scrollY; }
    clearTimeout(idleT);
    if (narrow && readingDown) idleT = setTimeout(() => { readingDown = false; chrome(); }, 1400);
    fab.classList.toggle("is-hidden", inStory || contactVisible || (narrow && readingDown));
    rail.classList.toggle("is-hidden", r.top > 1 || r.bottom < innerHeight * 0.5);
  }
  let raf = 0;
  addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; chrome(); }); }, { passive: true });
  addEventListener("resize", chrome);
  chrome();

  /* ── Carga diferida: GSAP y las fuentes de los ejemplos, después del primer pintado ── */
  const loadScript = (src, integrity) => new Promise((ok, fail) => {
    const s = document.createElement("script");
    if (integrity) { s.integrity = integrity; s.crossOrigin = "anonymous"; }
    s.src = src; s.onload = ok; s.onerror = fail;
    document.head.appendChild(s);
  });
  const CDN = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/";
  // Integridad (SRI): si el CDN entregara un archivo alterado, el navegador no lo ejecuta.
  // Si cambias la versión de GSAP, recalcula estos hashes.
  const SRI = {
    "gsap.min.js": "sha384-g4NTh/Iv5PPU4xPyhEWqPcwtNXOvdaDI8LLnyYfyNZOjKJeYQyjzQ9X5275eBjpt",
    "ScrollTrigger.min.js": "sha384-Z3REaz79l2IaAZqJsSABtTbhjgOUYyV3p90XNnAPCSHg3EMTz1fouunq9WZRtj3d"
  };
  const afterPaint = new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
  afterPaint
    .then(() => loadScript(CDN + "gsap.min.js", SRI["gsap.min.js"]))
    .then(() => loadScript(CDN + "ScrollTrigger.min.js", SRI["ScrollTrigger.min.js"]))
    .then(initStory)
    .catch(() => root.classList.remove("js")); // sin GSAP: la historia se muestra completa, una página bajo la otra

  const loadDemoFonts = () => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Young+Serif&family=Anton&family=Baloo+2:wght@600;800&family=Bodoni+Moda:ital,opsz,wght@1,6..96,500&family=Barlow+Condensed:wght@600;800&display=swap";
    document.head.appendChild(l);
  };
  if (document.readyState === "complete") loadDemoFonts(); else addEventListener("load", loadDemoFonts, { once: true });

  /* ── La historia: ventana que cambia con el scroll ───── */
  function initStory() {
  const gsap = window.gsap, ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);

  const skins = $$(".skin"), caps = $$(".cap"), pages = skins.map(s => $(".page", s));
  const vp = $("#vp"), urlText = $("#urltext"), tag = $("#tag"), stage = $(".stage"), bar = $("#progressbar"), loadbar = $("#loadbar");
  stage.classList.add("is-ready");
  const N = skins.length;
  const NAMES = ["Sin página", "Restaurante", "Barbería", "Almacén", "Botillería", "Banquetería", "Construcción", "¿Y tu negocio?"];
  const READ = 1.4, HOLD = 0.7, VH_PER_UNIT = 46;
  const extra = i => Math.max(0, pages[i].scrollHeight - vp.clientHeight);
  // el contenido interno solo se mueve con la historia: si el foco o un clic intenta desplazar la ventana, se vuelve a 0
  skins.forEach((s, i) => s.style.setProperty("--skin-bg", getComputedStyle(pages[i]).backgroundColor));
  // al tabular dentro de la ventana, el navegador desplaza la página para mostrar el foco
  // y eso cambiaría de capítulo: devolvemos el scroll a donde estaba
  let keyY = null, lockUntil = 0;
  document.addEventListener("keydown", e => { if (e.key === "Tab") keyY = scrollY; }, true);
  stage.addEventListener("focusin", () => {
    if (keyY === null) return;
    const y = keyY; keyY = null;
    lockUntil = performance.now() + 500;
    setTimeout(syncStage, 520);
    const back = () => { if (Math.abs(scrollY - y) > 1) scrollTo({ top: y, behavior: "instant" }); };
    back(); requestAnimationFrame(back);
  });
  [stage, $(".browser"), vp, ...skins].forEach(el => el.addEventListener("scroll", () => { el.scrollTop = 0; el.scrollLeft = 0; }));

  // línea de tiempo (unidades arbitrarias; el scroll la recorre)
  // Cada cambio de sitio imita una navegación real: se escribe la URL y avanza la barra de carga (NAV),
  // la página nueva sube como una hoja mientras la anterior retrocede (REVEAL), y luego se recorre (read).
  const NAV = reduce ? 0.001 : 0.3, REVEAL = reduce ? 0.001 : 0.85;
  const tl = gsap.timeline({ defaults: { ease: "none" }, paused: true });
  const marks = [0], arrive = [0], zones = [];
  gsap.set(skins.slice(1), { y: 0, yPercent: 100 });
  gsap.set(loadbar, { scaleX: 0, autoAlpha: 0 });
  tl.to({}, { duration: HOLD });
  for (let i = 1; i < N; i++) {
    const t = tl.duration(), t2 = t + NAV;
    marks[i] = t + NAV * 0.5;
    arrive[i] = t2 + REVEAL;
    zones.push([t, arrive[i]]);
    if (!reduce) {
      tl.fromTo(loadbar, { scaleX: 0, autoAlpha: 1 }, { scaleX: 0.7, duration: NAV + REVEAL * 0.5, ease: "power1.out", immediateRender: false }, t);
      tl.to(loadbar, { scaleX: 1, duration: REVEAL * 0.5, ease: "power1.in" }, t2 + REVEAL * 0.5);
      tl.to(loadbar, { autoAlpha: 0, duration: 0.12 }, arrive[i]);
      tl.fromTo(skins[i],
        { yPercent: 100, borderRadius: "26px 26px 0px 0px", boxShadow: "0px -18px 40px rgba(8,12,28,0.42)" },
        { yPercent: 0, borderRadius: "0px 0px 0px 0px", boxShadow: "0px -18px 40px rgba(8,12,28,0)", duration: REVEAL, ease: "power3.inOut", immediateRender: false }, t2);
      tl.to(skins[i - 1], { scale: 0.95, yPercent: -5, opacity: 0.5, duration: REVEAL, ease: "power3.inOut" }, t2);
      tl.to(skins[i - 1], { autoAlpha: 0, duration: 0.01 }, arrive[i]);
    } else {
      tl.set(skins[i], { yPercent: 0 }, t2);
      tl.set(skins[i - 1], { autoAlpha: 0 }, t2);
    }
    // pausa para leer la portada, recorrido proporcional al largo de la página, pausa al final
    const ratio = extra(i) / Math.max(1, vp.clientHeight);
    const read = ratio > 0.01 ? gsap.utils.clamp(0.9, 2.4, READ * ratio) : 0;
    tl.to({}, { duration: 0.35 }, arrive[i]);
    if (read) tl.to(pages[i], { y: () => -extra(i), duration: read, ease: "power1.inOut" }, arrive[i] + 0.35);
    tl.to({}, { duration: read ? 0.3 : HOLD });
  }
  tl.to({}, { duration: HOLD });
  story.style.setProperty("--story-h", `calc(${(tl.duration() * VH_PER_UNIT).toFixed(0)}svh + 100svh)`);

  // escribir la URL letra por letra
  let typing;
  function typeUrl(text) {
    clearInterval(typing);
    if (reduce) { urlText.textContent = text; return; }
    let n = 0; urlText.textContent = "";
    typing = setInterval(() => {
      urlText.textContent = text.slice(0, ++n);
      if (n >= text.length) clearInterval(typing);
    }, 42);
  }

  // riel lateral
  NAMES.forEach((name, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", `Ir a: ${name}`);
    b.innerHTML = `<span>${name}</span>`;
    b.addEventListener("click", () => goTo(i));
    rail.appendChild(b);
  });
  const dots = [...rail.children];

  function setStage(i) {
    if (i === currentChapter && urlText.dataset.set) return;
    urlText.dataset.set = "1";
    currentChapter = i;
    skins.forEach((s, k) => { s.inert = k !== i; });
    caps.forEach((c, k) => c.classList.toggle("is-on", k === i));
    dots.forEach((d, k) => { d.classList.toggle("is-on", k === i); d.toggleAttribute("aria-current", k === i); });
    typeUrl(skins[i].dataset.url);
    tag.textContent = skins[i].dataset.tag;
    stage.style.setProperty("--glow", skins[i].dataset.glow);
  }

  function syncStage() {
    if (performance.now() < lockUntil) return;
    const time = tl.time();
    let i = 0;
    while (i + 1 < N && marks[i + 1] <= time) i++;
    setStage(i);
    bar.style.transform = `scaleX(${tl.progress().toFixed(4)})`;
  }
  tl.eventCallback("onUpdate", syncStage);

  const st = ST.create({
    trigger: story,
    start: "top top",
    end: "bottom bottom",
    animation: tl,
    scrub: reduce ? true : 0.9,
    invalidateOnRefresh: true,
    // si el scroll se detiene a mitad de un cambio de sitio, lo termina (o lo deshace) con suavidad
    snap: reduce ? false : {
      snapTo: v => {
        const D = tl.duration(), time = v * D;
        for (const [a, b] of zones) {
          if (time > a + 0.02 && time < b - 0.02) return ((time - a) / (b - a) < 0.5 ? a : b + 0.02) / D;
        }
        return v;
      },
      delay: 0.12,
      duration: { min: 0.25, max: 0.7 },
      ease: "power2.inOut",
      inertia: false
    }
  });

  function goTo(i) {
    const time = i === 0 ? 0 : arrive[i] + 0.05;
    const top = st.start + (st.end - st.start) * (time / tl.duration());
    scrollTo({ top: Math.ceil(top), behavior: reduce ? "auto" : "smooth" });
  }

  setStage(0);
  // puente para el nombre del negocio (se escribe antes de que cargue GSAP)
  window.__found = {
    goTo,
    showUrl: d => { clearInterval(typing); urlText.textContent = d; }
  };
  if (bizName) setBiz(bizName);

  /* ── Proceso: la línea se llena y cada paso se ilumina al bajar ── */
  const stepsLi = $$(".steps li"), fill = $("#steps-fill");
  const lightSteps = p => {
    fill.style.setProperty("--p", p.toFixed(3));
    stepsLi.forEach((li, k) => li.classList.toggle("is-lit", p >= k / (stepsLi.length - 1) - 0.02));
  };
  if (reduce) lightSteps(1);
  else ST.create({ trigger: ".steps-wrap", start: "top 72%", end: "bottom 62%", onUpdate: self => lightSteps(self.progress), onRefresh: self => lightSteps(self.progress) });

  // las fuentes cambian el alto de las páginas: recalcular
  let refreshT;
  const refresh = () => { clearTimeout(refreshT); refreshT = setTimeout(() => ST.refresh(), 120); };
  if (document.fonts) {
    document.fonts.ready.then(refresh);
    document.fonts.addEventListener && document.fonts.addEventListener("loadingdone", refresh);
  }
  addEventListener("load", refresh);

  /* ── Entradas suaves de las secciones ─────────────────── */
  if (!reduce) {
    const REVEAL = ".sec-head, .svc-list li, .svc-gh, .soft-copy, .editor, .qa details, .form, .sec-cta";
    const below = $$(REVEAL).filter(el => el.getBoundingClientRect().top > innerHeight);
    gsap.set(below, { autoAlpha: 0, y: 18 });
    const show = els => gsap.to(els, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out", stagger: 0.06, overwrite: true });
    ST.batch(below, { start: "top 90%", once: true, onEnter: show, onEnterBack: show });
  }
  }
})();
