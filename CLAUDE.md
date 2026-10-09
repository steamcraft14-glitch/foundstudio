# foundstudio.cl

Sitio estático (HTML, CSS y JS, sin backend) publicado con GitHub Pages en https://foundstudio.cl.

- No borrar ni cambiar el archivo `CNAME`: mantiene el dominio personalizado.
- El repo es público: nunca poner contraseñas ni claves privadas en el código. (La clave de Web3Forms es una clave pública de formulario, pensada para ir en el sitio.)
- Configuración en las primeras líneas de `assets/js/main.js`: `WEB3FORMS_KEY` y `WHATSAPP`.
- Al cambiar `assets/css/styles.css` o `assets/js/main.js`, sube el número `?v=` en `index.html` para que los visitantes no vean una versión vieja.
- Pruebas: con un servidor local en el puerto 8417 (`python -m http.server 8417`), correr `playwright-cli run-code --filename=tests/qa.js`.
- Diseño: `DESIGN.md` (sistema visual) y `PRODUCT.md` (producto). Marca: azul #1E2A4A y crema #F2ECDF; logos en `found-logo/`.
- Cada `git push` a `main` republica el sitio.
