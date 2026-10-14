# Sistema visual · foundstudio.cl

Versión 2 del rediseño (14 de octubre de 2026): oscuro y vibrante, tipo app. Pedido del dueño: más llamativo, sin fotos de terceros y sin precios fijos.

## La idea
La portada es una ventana de navegador que escribe `tunegocio.cl`, muestra un **404** y se "arregla" con un barrido celeste hasta un sitio real de cliente (**200 OK**). Al lado flota un celular con un ejemplo. Ese es el único momento llamativo de la página; el resto es ordenado: buscador 404 contra encontrado, servicios con celulares, carrusel de rubros, trabajo real, pasos, asistente de estimado, preguntas y llamado final.

## Tokens (`assets/css/site.css`)
| Rol | Valor |
|---|---|
| Fondo "noche" | `#0F1528`, con luces lila y celeste y una trama de puntos fija detrás |
| Superficies | navy `#1F2A4A` · elevadas `#2A3760` |
| Texto | crema `#F2ECDF` · secundario `#B9BFD0` |
| Acción y llaves | lila `#C586C0` (botones píldora con brillo) |
| Encontrado / 200 OK | celeste `#9CDCFE` (color de código de la marca) |
| Tipografía | Sora 400–800 alojada en el sitio; monoespaciada del sistema solo en direcciones y códigos |
| Radios | 20–28 px en tarjetas, 34–44 px en celulares, píldora en botones |

## Componentes
- `.win`: ventana de navegador (portada y casos reales).
- `.device` / `.phone`: marco de celular para capturas y para los ejemplos vivos.
- `.svc`: tarjeta de servicio con dos celulares.
- `.chat`: asistente de estimado (en línea en el inicio y en panel flotante en todas las páginas).

## Imágenes
Solo propias: capturas de los ejemplos ficticios (`assets/img/ejemplos/`), capturas de clientes reales (`assets/img/casos/`) y la animación del logo (`assets/video/`).

## Movimiento
La secuencia de la portada (escribir, 404, barrido, 200 OK), el celular flotando, el glitch breve del 404 y las respuestas a cada acción (chat, botones, tarjetas). Con «reducir movimiento» la portada queda fija en el estado encontrado y nada se anima.
