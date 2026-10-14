# foundstudio.cl

Sitio estático (HTML, CSS y JS, sin librerías externas; el portal de clientes usa Supabase) publicado con GitHub Pages en https://foundstudio.cl.

## Páginas
- `index.html` inicio · `servicios/` · `ejemplos/` seis negocios ficticios interactivos · `contacto/` formulario · `brief/` brief en línea para clientes que aceptaron la propuesta (no se indexa ni va en el sitemap) · `mi-proyecto/` portal del cliente · `panel/` panel de administración (ambos sin indexar) · `privacidad.html` · `404.html`.
- Estilos: `assets/css/site.css` (todo el sitio, tema oscuro) y `assets/css/ejemplos.css` (solo los negocios ficticios).
- Scripts: `assets/js/site.js` (común), `goatcounter.js` (visitas), `asistente.js` (chat de estimado, en todas las páginas), `ejemplos.js`, `contacto.js`, `brief.js` (con `assets/css/brief.css`), `privacidad.js`.
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

## Brief en línea
Cuando un cliente acepta, mándale `https://foundstudio.cl/brief/?negocio=Nombre%20del%20negocio&nombre=Juan&servicio=tienda` (`servicio`: `pagina`, `tienda`, `software` o `varios`; decide qué secciones aparecen). Llega a contacto@foundstudio.cl con asunto «Brief: …». Web3Forms gratis no recibe archivos: las fotos y el logo llegan por un enlace de Drive o por WhatsApp. El borrador vive en el `localStorage` del cliente y se borra al enviar (declarado en `privacidad.html#cookies`).

## Portal y panel (Supabase)
Guía completa en `docs/PORTAL.md`. Base de datos y permisos en `supabase/migrations/`, función del servidor (correos con Resend, invitar clientes, cambiar estados, visitas) en `supabase/functions/found/`; `supabase/` no se publica. En el sitio: `sesion.js` (entrada sin contraseña), `portal.js`, `panel.js`, `assets/css/cuenta.css`, y `assets/js/vendor/supabase-2.45.4.js` (copia local, hash verificado con npm). `guardar()` de `site.js` guarda cotizaciones y estimados sin cargar la librería. En `site.js` solo van `SUPABASE_URL` y la clave **anon** (pública); `service_role` y la clave de Resend van como secretos de la función, nunca en el repo. La CSP permite solo `https://qwmxzaeyhqdwndijquab.supabase.co`.

## Visitas (GoatCounter)
Panel en https://foundstudio.goatcounter.com. Script local `assets/js/goatcounter.js` (cargado en todas las páginas menos `/brief/`), permitido en la CSP como `https://foundstudio.goatcounter.com` en `connect-src` e `img-src`. Los eventos de `track()` van como `evento/<nombre>/<detalle>`. Para no contar tus propias visitas, abre `foundstudio.cl/#toggle-goatcounter` una vez en cada dispositivo tuyo.

## Pruebas
Con un servidor local (`python -m http.server 8417 --bind 127.0.0.1`), correr `python tests/qa.py` y `python tests/portal_qa.py` (Supabase simulado). Permisos de la base de datos: `tests/rls.mjs` (ver `docs/PORTAL.md`). El formulario no se envía de verdad durante las pruebas.

## Diseño y producto
`DESIGN.md` (sistema visual) y `PRODUCT.md` (producto). Marca v10: navy #1F2A4A, crema #F2ECDF, lila #C586C0, Sora. Logos en `found-logo/v10-final/` (copias web en `assets/brand/`).

Cada `git push` a `main` republica el sitio.
