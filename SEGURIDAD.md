# Seguridad y protección de datos · foundstudio.cl

Qué exige la ley chilena a este sitio, qué ya está hecho en el código y qué depende de ti fuera del código.

**Qué tipo de sitio es:** empresa privada, sitio estático (GitHub Pages), sin base de datos, sin pagos, sin cuentas de usuario. Recoge datos personales solo en el formulario de contacto (llegan al correo vía Web3Forms).

- **Ley 21.719 (datos personales):** sí aplica, porque el formulario recoge datos de personas. Entra en vigencia el 1 de diciembre de 2026.
- **Ley 21.663 (Ley Marco de Ciberseguridad):** no aplica directamente. Rige a servicios esenciales y operadores de importancia vital. Las buenas prácticas igual se aplican abajo.
- **Decreto 7 e instructivos para el Estado:** no aplican, porque no es un organismo público. La accesibilidad (WCAG) igual se cuida en el diseño.

## Hecho en el código

| Medida | Dónde |
|---|---|
| Política de privacidad: responsable, datos, finalidad, base legal, proveedores y transferencia internacional, plazos, cookies, seguridad, derechos, reclamos | `privacidad.html` |
| Consentimiento explícito: casilla obligatoria **sin marcar**, con enlace a la política | formulario en `index.html` |
| Registro del consentimiento: cada envío lleva qué versión de la política se aceptó y cuándo | `main.js` → `consentimiento`, `PRIVACIDAD_VERSION` |
| Derechos ARCO+ (acceso, rectificación, supresión, oposición, portabilidad, bloqueo y retiro del consentimiento): formulario que arma la solicitud por correo | `privacidad.html#derechos`, `assets/js/privacidad.js` |
| Enlaces a la política y a los derechos en el pie | `index.html` |
| Sin cookies, sin `localStorage` ni analítica, así que no hace falta banner de cookies | todo el sitio |
| HTTPS obligatorio (http redirige a https) | GitHub Pages |
| Content-Security-Policy: solo se ejecuta código propio, GSAP de cdnjs y un script en línea autorizado por hash. Bloquea `<object>`, iframes y `<base>` inyectados. Los datos solo pueden salir hacia Web3Forms | `<meta>` en `index.html`, `privacidad.html`, `404.html` |
| Subresource Integrity: GSAP se verifica con hash. Si el CDN entrega un archivo alterado, no se ejecuta | `main.js` → `SRI` |
| `Referrer-Policy: strict-origin-when-cross-origin` y `rel="noopener noreferrer"` en enlaces externos | HTML |
| Límite de largo en los campos (`maxlength`) y trampa anti-spam (`botcheck`) | formulario |
| Mensajes de estado con texto fijo (sin insertar lo que escribe el usuario como HTML) | `main.js`, `privacidad.js` |
| `security.txt` para reportar vulnerabilidades | `.well-known/security.txt` (vence 2027-10-09: renuévalo) |
| `.nojekyll` para que GitHub Pages publique `.well-known/` | raíz |

### Al editar, ojo con esto
- Si cambias el `<script>` en línea del `<head>` de `index.html`, recalcula su hash y actualízalo en la CSP:
  `printf '%s' 'CONTENIDO_DEL_SCRIPT' | openssl dgst -sha256 -binary | openssl base64 -A`
- Si cambias la versión de GSAP, recalcula los hashes `SRI` de `main.js`:
  `curl -s URL | openssl dgst -sha384 -binary | openssl base64 -A`
- Si agregas un servicio externo (analítica, mapa, chat, video), tienes que: (1) permitirlo en la CSP, (2) agregarlo a la tabla de proveedores de `privacidad.html` y (3) si usa cookies que no son necesarias, pedir consentimiento **antes** de cargarlo.
- Si cambias la política, actualiza la fecha en `privacidad.html` y en `PRIVACIDAD_VERSION` de `main.js`.

## Lo que tienes que hacer tú (fuera del código)

1. **Verificación en dos pasos (2FA)** en GitHub, en el correo `contacto@foundstudio.cl`, en Web3Forms y en el registrador del dominio (NIC Chile). Quien entre a cualquiera de ellos puede cambiar el sitio o leer los datos.
2. **Mínimo privilegio:** solo las personas que lo necesitan tienen acceso de escritura al repo y al correo. Revísalo cada 6 meses.
3. **Identifica al responsable:** si el estudio tiene razón social y RUT, agrégalos en la sección 1 de `privacidad.html`.
4. **Plazos de conservación:** borra del correo las consultas que no terminaron en proyecto después de 12 meses, como promete la política.
5. **Respaldos:** el repo de GitHub ya es un respaldo del sitio. Guarda además una copia fuera de GitHub (`git clone` en otro disco o nube) y respalda el correo.
6. **Responder solicitudes ARCO+** dentro de 30 días corridos. Anota cada solicitud: fecha, qué pidió y qué hiciste.
7. **Opcional, para más protección:** poner Cloudflare (plan gratis) delante de GitHub Pages. Eso agrega un WAF y protección DDoS, y permite cabeceras HTTP reales que GitHub Pages no deja configurar: HSTS, `X-Frame-Options`/`frame-ancestors` (contra clickjacking), `X-Content-Type-Options` y `Permissions-Policy`.
8. **Opcional:** alojar las fuentes y GSAP en el propio sitio, para no pasar la IP de los visitantes a Google y Cloudflare. Después se quitan de la CSP y de la tabla de proveedores.
9. **Revisión anual:** correr un análisis de vulnerabilidades (por ejemplo, Mozilla Observatory o securityheaders.com) y renovar `security.txt`.

## Si hay un incidente (filtración, hackeo, cambio no autorizado del sitio)

1. **Contener:** cambia las contraseñas, cierra las sesiones abiertas en GitHub, el correo y Web3Forms, y revoca la clave de Web3Forms y genera una nueva.
2. **Restaurar:** vuelve el sitio a la última versión buena (`git revert`) y revisa el historial de commits y los accesos.
3. **Evaluar:** qué datos se expusieron, de cuántas personas y desde cuándo.
4. **Notificar:** si hay riesgo para las personas, avisa a la **Agencia de Protección de Datos Personales** y a los afectados sin demora. Usa 72 horas como plazo máximo interno.
5. **Registrar:** qué pasó, qué se hizo y qué se cambió para que no se repita.
