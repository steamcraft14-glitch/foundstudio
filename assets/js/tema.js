/* {found} studio · tema claro u oscuro de /mi-proyecto/ y /panel/
   Se carga sin defer en el <head> para aplicar el tema antes de pintar (sin parpadeo).
   Preferencia: "oscuro" (por defecto, el de la marca), "claro" o "auto" (sigue al sistema).
   Se guarda en este navegador y, con sesión abierta, en la cuenta (sesion.js la sincroniza). */
(() => {
  "use strict";
  const CLAVE = "found-tema", OPCIONES = ["oscuro", "claro", "auto"];
  const sistema = matchMedia("(prefers-color-scheme: light)");
  const leer = () => { try { const v = localStorage.getItem(CLAVE); return OPCIONES.includes(v) ? v : "oscuro"; } catch (_) { return "oscuro"; } };
  let pref = leer();

  const aplicar = () => {
    const claro = pref === "claro" || (pref === "auto" && sistema.matches);
    const html = document.documentElement;
    html.dataset.tema = claro ? "claro" : "oscuro";
    html.style.colorScheme = claro ? "light" : "dark";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = claro ? "#F5F0E6" : "#0F1528";
    // logo con letras navy sobre fondo claro
    document.querySelectorAll(".wordmark img").forEach(img => {
      img.src = img.src.replace(/found-horizontal(-dark)?\.svg/, claro ? "found-horizontal-dark.svg" : "found-horizontal.svg");
    });
  };

  window.tema = {
    OPCIONES,
    actual: () => pref,
    poner(valor) {
      if (!OPCIONES.includes(valor)) return;
      pref = valor;
      try { localStorage.setItem(CLAVE, valor); } catch (_) { /* sin almacenamiento: vale solo para esta visita */ }
      aplicar();
    }
  };

  aplicar();
  document.addEventListener("DOMContentLoaded", aplicar);
  sistema.addEventListener("change", () => { if (pref === "auto") aplicar(); });
})();
