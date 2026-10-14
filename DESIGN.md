# Sistema visual · foundstudio.cl

Rediseño del 14 de octubre de 2026. Dirección de arte: «Type and nothing else» (taste-skill, semilla 587946220), con la marca v10 encima.

## La idea
La primera pantalla son solo palabras y color: **QUE TE ENCUENTREN.** cortado por una línea de flotación (crema arriba, navy abajo). Abajo, el problema (el 404), el lugar (Huechuraba), una cosa viva (escribe cómo te buscan y mira el 404 contra el resultado encontrado), trabajo real, el precio en grande, cómo partimos, preguntas, un solo campo que abre WhatsApp y el nombre {found} recortado en el pie.

## Tokens (`assets/css/site.css`)
| Rol | Valor |
|---|---|
| Navy (tinta y campos) | `#1F2A4A` · un tono: `#283558` |
| Crema (fondo) | `#F2ECDF` · un tono: `#E7DFCD` · campos de formulario `#FFFCF5` |
| Lila (acción y llaves) | `#C586C0` |
| Tinta suave | `#4A5476` sobre crema, `#B9BFD0` sobre navy (solo notas secundarias) |
| Tipografía | Sora 400–800, alojada en el sitio. Sin monoespaciada. |
| Tamaños | 14 · 18 · 22–32 · 42–100 · 64–168 px (`--t1` a `--t5`) |
| Márgenes | `--m` 16–32 px · entre secciones `--gap` 112–200 px |

## Reglas de la casa
- Titulares en dos líneas como máximo, en todo ancho.
- Esquinas rectas; botones de un solo relleno (lila o navy).
- Sin sombras en reposo (solo el menú del celular, que flota), sin degradados, sin etiquetas pequeñas sobre los títulos, sin numeración 01/02/03.
- Las secciones cambian de campo de color (crema, lila, navy, tono crema) en vez de separarse con líneas.
- Los negocios ficticios de `/ejemplos/` tienen su propia identidad (colores y tipografías del sistema) dentro del marco del celular y nunca usan la marca {found}.

## Imágenes
- Capturas reales de clientes: `assets/img/casos/` (Nubi, Gracia & Vida).
- Fotos del mundo de las pymes, con licencia libre y crédito en el pie: `assets/img/mundo/` (Wikimedia Commons y Flickr).
- Video: la animación de marca `assets/video/found-animacion.mp4` (inicio y 404).

## Movimiento
Titular que sube desde su línea base al cargar; entradas suaves (opacidad y desplazamiento) por sección; deriva lenta de la foto de Huechuraba; respuesta al tocar en cada control. Con «reducir movimiento» todo queda quieto y visible.
