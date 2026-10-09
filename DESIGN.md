---
name: "{found} studio"
description: "¿Tu negocio da 404? Te hacemos {found}. Navy ground, cream ink, one browser window that gets fixed."
colors:
  navy: "#1E2A4A"
  navy-2: "#253259"
  navy-deep: "#0F1630"
  cream: "#F2ECDF"
  cream-2: "#E8E0CF"
  muted: "#E2DACA"
  line: "#3A4670"
  ink-soft: "#46506E"
  paper: "#FFFFFF"
  signal-blue: "#6F86C9"
  err-on-cream: "#A3261A"
  ok-on-cream: "#1F6B3A"
typography:
  display:
    fontFamily: "Fredoka, Manrope, system-ui, sans-serif"
    fontSize: "clamp(44px, 5.6vw, 84px)"
    fontWeight: 700
    lineHeight: 0.96
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Fredoka, Manrope, system-ui, sans-serif"
    fontSize: "clamp(34px, 4.8vw, 62px)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Fredoka, Manrope, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.1
  body:
    fontFamily: "Manrope, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.55
  body-lead:
    fontFamily: "Manrope, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(17px, 1.4vw, 20px)"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Manrope, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.005em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, Cascadia Mono, Consolas, monospace"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1
  mono-tag:
    fontFamily: "JetBrains Mono, ui-monospace, Cascadia Mono, Consolas, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.04em"
rounded:
  pill: "999px"
  window: "22px"
  window-mobile: "18px"
  case-window: "16px"
  field: "12px"
  tile: "8px"
  focus: "6px"
spacing:
  gutter: "clamp(16px, 4vw, 56px)"
  section: "clamp(80px, 11vw, 150px)"
  container: "1200px"
  header: "64px"
  header-mobile: "58px"
  stack-head: "clamp(40px, 6vw, 72px)"
components:
  button-primary:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.navy}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 26px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.navy}"
  button-primary-on-cream:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.cream}"
    rounded: "{rounded.pill}"
    height: "52px"
  button-small:
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "44px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.cream}"
    rounded: "{rounded.pill}"
    padding: "0 26px"
    height: "52px"
  button-outline-hover:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.navy}"
  chip-trade:
    backgroundColor: "transparent"
    textColor: "{colors.cream}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "44px"
  chip-trade-hover:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.navy}"
  url-pill:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.navy}"
    typography: "{typography.mono}"
    rounded: "{rounded.pill}"
    padding: "7px 14px"
  window-tag:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.cream}"
    typography: "{typography.mono-tag}"
    rounded: "{rounded.pill}"
    padding: "6px 10px"
  input-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.navy}"
    rounded: "{rounded.field}"
    padding: "12px 14px"
    height: "50px"
  nav-header:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.muted}"
    height: "{spacing.header}"
---

# Design System: {found} studio

## Overview

**Creative North Star: "The Window That Gets Fixed"**

The whole system is one object taken from the logo: a cream browser window with a thick frame, three dots, a mono URL pill and a hard navy-deep shadow, sitting on a navy ground. It starts broken (ERROR 404) and gets fixed into real pages. Everything outside the window speaks only navy and cream; everything inside it may become any trade's world. That split is the system's spine: the brand is the frame, the client is the content.

The tone is friendly and solid. Fredoka's bubbly display letters echo the logo's lettering, Manrope carries the reading, and JetBrains Mono appears only where the web itself talks (URLs, search queries, placeholder captions). Density is low on the navy sections, with long editorial lists divided by hairlines instead of card grids. Depth is printed, not lit: hard offset shadows in a single dark ink, never a soft glow under a card. The one atmospheric effect is a per-chapter radial halo behind the window.

The page closes by flipping the ground: the contact section turns cream with navy ink, so the form reads as the page's own "fixed" state.

**Key Characteristics:**
- Two brand colors only outside the window: navy #1E2A4A ground, cream #F2ECDF ink and chrome.
- The browser window (thick cream frame, dots, mono URL pill, hard shadow) is the signature component; its URL pill recurs on the paper inside each portfolio folder.
- Pill geometry for every action (999px), soft-rounded frames (22px window, 16px case window, 12px fields).
- Hard offset shadows in navy-deep, no blur; depth is a printed offset, not ambient light.
- Lists over cards: services, steps and FAQ are ruled lists on navy.
- Demo worlds (trade palettes and fonts) are contained inside the window viewport and never leak to the brand surface.

## Colors

A two-color brand (deep navy and warm cream) with tonal steps of each, one cool signal blue for progress, and on-cream status inks for the form.

### Primary
- **Logo Navy** (navy): the page ground everywhere outside the contact section; ink on cream surfaces; the 404 screen inside the window; the dots and URL pill border in the chrome.
- **Bone Cream** (cream): all text on navy, the window frame and chrome, primary buttons, the contact section ground, focus outlines on navy.

### Secondary
- **Signal Blue** (signal-blue): the chapter progress fill along the bottom of the window chrome and one channel of the 404 glitch. Never a text or button color.

### Neutral
- **Raised Navy** (navy-2): the portfolio section ground and rail tooltips; the only alternate dark surface.
- **Shadow Navy** (navy-deep): exclusively the hard offset shadow under the window, case windows, primary-button hover and the WhatsApp button.
- **Warm Muted** (muted): secondary text on navy (captions, section ledes, list descriptions, nav links at rest). It is a warm off-cream, not a gray.
- **Rule Navy** (line): hairlines and dividers on navy, the header's bottom rule, the 404 search outline, step connectors.
- **Kraft** (#D9CCAE, back #CDBE9C): portfolio folder board; the "Próximamente" folder swaps to cream with a dashed outline.
- **Slate Ink** (ink-soft): secondary text on cream (contact copy, optional-field labels, placeholder captions).
- **Paper** (paper): the URL pill interior, the form card, and input fields; the primary button's hover lift on navy.
- **Error Brick** (err-on-cream) and **Success Green** (ok-on-cream): form validation and send status on cream only.

### Named Rules
**The Two-Inks-Outside Rule.** Outside the browser window the page uses only navy and cream and their listed steps. Trade colors exist only inside the window viewport.

**The Halo Is the Only Glow Rule.** The per-chapter radial halo behind the window (stage glow, 60% opacity, transitioned over 1s) is the system's one atmospheric gradient. Its hue comes from the current chapter: 404 #33406A, restaurante #7A1E12, barbería #8A6B22, almacén #1F6B3A, banquetería #6E3A58, construcción #9A4A1A, tu negocio #3B4A7C.

### Demo Worlds (contained layer, not brand tokens)
Each trade example inside the window carries its own palette and type, labeled "Ejemplo ficticio". These values are content, not system; never reuse them on the brand surface.
- **Restaurante:** cream paper #FBF4E8, oxblood #7A1E12, dark brown ink #3B1A12, mustard badge #F2C14E; Young Serif.
- **Barbería:** near-black #0E0E0E, bone #EDE6D6, brass #C8A24A; Anton uppercase, mono time slots.
- **Almacén:** warm white #FFFDF6, grocer green #1F6B3A, deep green ink #173B22, yellow #F6C945; Baloo 2.
- **Banquetería:** blush paper #F6EFE7, plum ink #3A1D2E; Bodoni Moda italic.
- **Construcción:** concrete #E4E1DB, asphalt #1C1C1C, safety orange #F26B1D, rust #9A3608; Barlow Condensed uppercase, 4px corners.

## Typography

**Display Font:** Fredoka (with Manrope, system-ui)
**Body Font:** Manrope (with system-ui, -apple-system, Segoe UI)
**Label/Mono Font:** JetBrains Mono (with ui-monospace, Cascadia Mono, Consolas)

**Character:** Fredoka's rounded, bubbly forms are the logo's voice at headline scale; Manrope is a calm, open grotesque that keeps the copy legible and close. Mono is the web's own voice and appears only where a browser would speak.

### Hierarchy
- **Display** (700, clamp(44px, 5.6vw, 84px), 0.96, -0.02em): the opening question in the story caption only. Mobile drops to clamp(32px, 9.2vw, 40px).
- **Headline** (600, clamp(34px, 4.8vw, 62px), 1.02, -0.015em): section headings, max 17ch; chapter captions use clamp(32px, 3.5vw, 52px); the contact heading runs clamp(38px, 5vw, 66px).
- **Title** (600, 26px, 1.1): portfolio case names, step names; service names scale clamp(26px, 3vw, 40px); FAQ questions clamp(20px, 2vw, 25px).
- **Body** (400, 17px, 1.55; 16px under 860px): running text. Measures held at 34 to 60ch.
- **Body Lead** (400, clamp(17px, 1.4vw, 20px)): section ledes in muted, max 52ch.
- **Label** (800, 16px, 1): buttons and form labels (15px); strong inline emphasis uses 800.
- **Mono** (500, 13px): the URL pill, the 404 search query, portfolio URL pills (11.5px), placeholder captions and the "Ejemplo ficticio" foot. **Mono Tag** (500, 11px, 0.04em, uppercase): the window's status tag only.

### Named Rules
**The Browser Speaks Mono Rule.** JetBrains Mono is reserved for things a browser or search box would print: URLs, queries, status tags, placeholder captions. Headings and buttons never use it.

**The Balanced Heading Rule.** Every h1 to h3 uses text-wrap: balance; prices and counts use tabular numerals.

## Layout

A single-column scroll with one pinned stage. The story is a sticky 100svh stage inside a tall scroll track; on desktop it is a two-column grid (captions minmax(300px, .8fr), window minmax(0, 1.55fr)) with a clamp(28px, 4vw, 72px) gap, the window capped at 920px wide and min(76svh, 700px) tall. Under 860px the stage stacks: a short caption at the top, the window filling the remaining height. A fixed dot rail appears at 1100px and up.

Below the story, sections share one rhythm: vertical padding clamp(80px, 11vw, 150px), a 1200px container with a clamp(16px, 4vw, 56px) gutter, and a section head (headline plus lede) separated from content by clamp(40px, 6vw, 72px). Services, steps and FAQ are ruled lists: a 2px cream rule opens the list and 1px line rules separate items. Grids widen at 860 to 980px: services to three columns, portfolio to three folders, steps to four across, FAQ and contact to a sticky-left two-column split.

The header is fixed, 64px (58px on mobile), navy with a 1px line rule beneath. Inside the window, demo pages respond to the window's own width via a container query at 560px, not to the viewport.

## Elevation & Depth

Depth is printed, not lit. The system uses hard offset shadows with zero blur in one dark ink, borrowed from the logo icon. Surfaces at rest on navy are flat; the window and its smaller portfolio siblings are the only permanently raised objects. Tonal layering (navy to navy-2) separates the portfolio section.

### Shadow Vocabulary
- **Window shadow** (`box-shadow: 10px 12px 0 0 #0F1630`; mobile `6px 7px 0 0 #0F1630`): the story window.
- **Case window shadow** (`box-shadow: 7px 8px 0 0 #0F1630`): portfolio windows.
- **Form card shadow** (`box-shadow: 10px 12px 0 0 #1E2A4A`; mobile `6px 7px 0 0`): the form on cream, where navy is the darkest ink available.
- **Button lift** (`box-shadow: 4px 5px 0 0 #0F1630` with `translate(-2px, -2px)`): primary button hover on navy; presses flat on active.
- **Floating action** (`box-shadow: 4px 5px 0 0 #0F1630`): the WhatsApp button.

### Named Rules
**The Printed Offset Rule.** Shadows are solid offsets toward the lower right in the darkest ink of the surrounding ground (navy-deep on navy, navy on cream). No blur radius on brand surfaces.

**The Flat Until Touched Rule.** Buttons are flat at rest; the offset appears only as a hover lift and disappears on press.

## Shapes

Rounded and friendly, never sharp. Every action and token-like element is a full pill (999px): buttons, chips, URL pills, status tags, the 404 search bar. Frames step down by scale: the story window 22px (18px on mobile) with a 5px cream border (4px mobile) and a 16px inner viewport corner; portfolio windows 16px with a 4px border; form card 22px with a 3px navy border; fields 12px. Circles mark sequence and state: step numbers (56px), rail dots, FAQ toggles drawn in CSS. Borders are thick (2px on interactive outlines, 4 to 5px on window frames) to match the logo's heavy stroke. Icons are inline SVG with round caps at a 2.4 stroke.

## Components

### Buttons
Tactile and round: a cream pill that lifts like a sticker.
- **Shape:** full pill (999px), 52px tall (44px small), 2px border slot.
- **Primary:** cream fill, navy label, Manrope 800 16px, 0 26px padding.
- **Hover / Focus:** fill goes to paper white, translates (-2px, -2px) and gains the navy-deep button lift; press returns flat. Focus is a 2px cream outline at 3px offset. Transitions use cubic-bezier(.16, 1, .3, 1) over 0.2s.
- **On cream:** in the contact section the primary inverts to a navy fill with cream label.
- **Outline:** transparent with a 2px currentColor border; hover fills with the opposite ink.

### Chips
- **Style:** trade chips in the final chapter are 44px cream-outlined pills, Manrope 700, linking to the form with the trade preselected.
- **State:** hover fills cream with navy text.

### Cards / Containers
- **Corner Style:** cards are avoided on navy; the only containers are browser windows (16 to 22px) and the form card (22px).
- **Background:** cream frame around content; paper white for the form.
- **Shadow Strategy:** Printed Offset Rule (see Elevation & Depth).
- **Border:** 3 to 5px, cream on navy, navy on cream.
- **Internal Padding:** form clamp(20px, 3.4vw, 36px).

### Inputs / Fields
- **Style:** paper white fill, 2px #C9C3B4 stroke, 12px radius, 50px minimum height, 16px navy text, visible 15px Manrope 800 labels above.
- **Focus:** border shifts to navy plus a 3px navy outline at 22% opacity.
- **Error / Disabled:** error brick border and a 14px 700 message beneath the field; disabled submit drops to 55% opacity.

### Navigation
- **Style:** fixed navy bar, logo left (v7-studio horizontal, 40px tall, 32px mobile), Manrope 600 15px links in muted, turning cream on hover; a small primary button closes the bar. Links hide under 980px, leaving logo and button.
- **Rail:** at 1100px and up, a column of 10px cream-ring dots on the right marks story chapters; the active dot fills; labels appear on hover/focus in a navy-2 tooltip.

### Browser Window (signature)
The logo's window, scaled up. Cream frame and chrome; three 12px dots (first filled navy, the others navy rings); a paper URL pill with a CSS-drawn lock, mono text typed letter by letter and a blinking caret; a navy mono status tag; a faint 3px overall-progress line plus a brighter load bar (#8EA3E6). Each site change plays as a navigation: the URL types and the load bar runs (NAV), then the new page rises as a sheet (yPercent 100→0, 26px top corners easing to 0, soft upward shadow fading out, power3.inOut) while the outgoing page recedes (scale 0.95, -5%, opacity 0.5); inner pages scroll with the scrub (0.9). If the scroll rests mid-change, ScrollTrigger snap completes or undoes it. Each inner page may carry its own demo world. With reduced motion or no JS, every page renders in final state, stacked in order.

### Ruled List (services, FAQ)
Editorial lists instead of card grids: a 2px cream rule on top, 1px line rules between items, a 48px stroked icon or a circular CSS plus toggle, Fredoka title and muted description in a three-column row on desktop.

## Do's and Don'ts

### Do:
- **Do** keep the brand surface to navy (#1E2A4A) and cream (#F2ECDF) plus their listed steps; confine every trade color and font to the window viewport.
- **Do** use the logo files from found-logo/v7-studio (and the v7 404 icon) exactly as supplied.
- **Do** render depth as a zero-blur offset in navy-deep (10px 12px on the window, 4px 5px on button hover).
- **Do** make every action a pill of at least 44px height, labeled in Manrope 800.
- **Do** set headings in Fredoka 600/700 with negative tracking and text-wrap: balance.
- **Do** use JetBrains Mono only for URLs, search queries, status tags and placeholder captions.
- **Do** keep secondary text on navy in warm muted (#E2DACA), never a cool gray.
- **Do** label every demo world "Ejemplo ficticio" and give every story state a no-JS and reduced-motion final form.

### Don't:
- **Don't** let a demo world's palette or font (Young Serif, Anton, Baloo 2, Bodoni Moda, Barlow Condensed) appear outside the browser window.
- **Don't** add blurred drop shadows to brand surfaces; the offset is the only shadow.
- **Don't** add a second atmospheric gradient; the chapter halo behind the window is the only glow (the faint 4% cream sheen on ruled-list hover is a state, not atmosphere).
- **Don't** build icon-title-text card grids on navy; services, steps and FAQ are ruled lists.
- **Don't** pin more than one section; the story stage is the single pin.
- **Don't** set body text below 13px or in a font other than Manrope on brand surfaces.
- **Don't** put small labels above headings; section heads are headline plus lede.

### Portfolio folder
A kraft folder (tab top-left, back board with the hard navy-deep offset) holding a white sheet that shows the client's domain in the window's URL pill. Hover or focus tilts the front flap back (rotateX -16deg) and lifts the sheet 26px; the whole folder is the link to the client's site (new tab). Folders whose link is still `LINK_PENDIENTE_n` render as a non-link block labelled "Link pendiente". The last folder, "Próximamente: tu negocio", is cream with a dashed outline and links to the contact form.
