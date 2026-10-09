# {found} studio — Sistema de diseño (MASTER)

Generado con UI UX Pro Max (`--design-system "creative agency landing navy" --variance 6 --motion 7 --density 4`)
y ajustado a la marca. Donde la recomendación del dataset chocaba con la marca (paleta rosa/verde,
estilo brutalista sin transiciones), manda la marca.

## Patrón
**Scroll-Triggered Storytelling + Conversión**
- Intro (problema: 404) → capítulos (rubros de ejemplo) → clímax ("¿Y tu negocio?") → CTA.
- Cada capítulo tiene su propio color (el halo detrás de la ventana cambia por rubro).
- Indicador de progreso (riel lateral en escritorio, barra en la ventana en celular).
- Mini CTA por capítulo + CTA final (formulario).
- Con `prefers-reduced-motion`: sin scrub ni pin animado; cada capítulo se muestra en su estado final, legible.
- El orden del DOM cuenta la historia completa aunque no haya JS.

## Color (fijo, de marca)
| Rol | Hex | Variable |
|---|---|---|
| Marino (fondo principal) | `#1E2A4A` | `--navy` |
| Marino 2 (superficies) | `#253259` | `--navy-2` |
| Marino profundo (sombra dura) | `#0F1630` | `--navy-deep` |
| Crema (texto sobre marino, botones) | `#F2ECDF` | `--cream` |
| Crema 2 (superficies claras) | `#E8E0CF` | `--cream-2` |
| Texto secundario sobre marino | `#C3C8D6` | `--muted` (≥ 7:1 sobre marino) |
| Línea | `#3A4670` | `--line` |
| Éxito | `#9BD7A8` | `--ok` |
| Error | `#FFB4A8` | `--err` |

Contraste: crema sobre marino = 11,6:1. Marino sobre crema = 11,6:1. Nada de gris sobre gris.
Los colores de los rubros de ejemplo viven solo dentro de la ventana del navegador.

## Tipografía
- **Display:** Fredoka 600/700 — redondeada, conversa con el logo burbuja y con el "404" del ícono.
- **Texto:** Manrope 400/600/800 — la del prototipo aprobado; legible y cercana.
- **Mono:** JetBrains Mono 500 — barra de URL, etiquetas, pasos.
- Escala: 13 · 15 · 17 · 20 · 24 · 32 · 44 · 64 (clamp). Cuerpo 16–17 px, interlineado 1,55.
- Títulos con `text-wrap: balance`. Precios y números con `tabular-nums`.

## Espaciado y forma
- Base 4/8 px. Secciones: 96–160 px escritorio, 72–96 px celular. Gutter 16 px en celular.
- Radios: 999 (pills/botones), 18 (ventana), 14 (tarjetas), 10 (inputs).
- Sombra firma: sombra dura desplazada `10px 12px 0 var(--navy-deep)` (la del logo). Sin sombras difusas genéricas.
- Contenedor máx. 1200 px.

## Movimiento (GSAP + ScrollTrigger)
- Historia: un único pin con `scrub` (0.6–1) — no más de un pin en la página.
- Transición entre rubros: máscara (clip-path) de arriba hacia abajo + leve escala; la página interna se desplaza con el scroll.
- Entradas de secciones: fade + 12–16 px, `power2.out`, 350–500 ms, stagger 50–60 ms.
- Salidas más rápidas que entradas. Solo transform/opacity/clip-path.
- Reduced motion: todo en estado final, sin escritura animada de URL.

## Interacción y accesibilidad
- Objetivos táctiles ≥ 44 px. Foco visible 2 px crema con offset 3 px.
- Formularios: etiqueta visible por campo, `autocomplete`, tipos `tel`/`email`, error bajo el campo, estado de envío con `aria-live`.
- Íconos SVG en línea (sin emoji como íconos).
- Botón flotante de WhatsApp: discreto, respeta safe-area y no tapa el envío del formulario.

## Anti-patrones a evitar
- Gradientes morados genéricos, glassmorphism decorativo, tarjetas con ícono+título+texto clonadas.
- Texto < 13 px, gris sobre marino de bajo contraste.
- Scroll horizontal en celular. Varias secciones pineadas.
- Contenido oculto por defecto sin alternativa sin JS.
