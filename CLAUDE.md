# foundstudio.cl

Sitio estático (HTML, CSS y JS, sin backend ni librerías externas) publicado con GitHub Pages en https://foundstudio.cl.

## Páginas
- `index.html` inicio · `servicios/` · `ejemplos/` seis negocios ficticios interactivos · `contacto/` formulario · `privacidad.html` · `404.html`.
- Estilos: `assets/css/site.css` (todo el sitio, tema oscuro) y `assets/css/ejemplos.css` (solo los negocios ficticios).
- Scripts: `assets/js/site.js` (común), `asistente.js` (chat de estimado, en todas las páginas), `ejemplos.js`, `contacto.js`, `privacidad.js`.
- Rangos de precio del asistente: objeto `RANGOS` al inicio de `assets/js/asistente.js`. El sitio no publica precios fijos en ninguna otra parte.

## Reglas
- No borrar ni cambiar `CNAME`: mantiene el dominio personalizado.
- El repo es público: nunca poner contraseñas ni claves privadas. La clave de Web3Forms es pública (pensada para ir en el sitio) y está en `assets/js/site.js` y en el campo oculto de `contacto/index.html`.
- Configuración en las primeras líneas de `assets/js/site.js`: `WHATSAPP`, `WEB3FORMS_KEY` y `PRIVACIDAD_VERSION` (súbela si cambia `privacidad.html`).
- Al cambiar un CSS o JS, sube el `?v=` en todas las páginas que lo cargan.
- Sin estilos ni scripts en línea: la CSP de cada página los bloquearía.
- `_config.yml` define qué NO se publica (CLAUDE.md, PRODUCT.md, tests, docs, found-logo, etc.). No agregar `.nojekyll`: anularía esa exclusión.
- Todo ejemplo de rubro va rotulado como ficticio. No inventar testimonios, métricas ni clientes.
- Sin fotos de terceros: solo capturas propias (ejemplos en `assets/img/ejemplos/`) y de clientes (`assets/img/casos/`).

## Pruebas
Con un servidor local (`python -m http.server 8417 --bind 127.0.0.1`), correr `python tests/qa.py`. El formulario no se envía de verdad durante las pruebas.

## Diseño y producto
`DESIGN.md` (sistema visual) y `PRODUCT.md` (producto). Marca v10: navy #1F2A4A, crema #F2ECDF, lila #C586C0, Sora. Logos en `found-logo/v10-final/` (copias web en `assets/brand/`).

Cada `git push` a `main` republica el sitio.
