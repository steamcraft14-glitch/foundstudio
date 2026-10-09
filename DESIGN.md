---
name: "{found} studio"
description: "Ctrl + found. ¿Tu negocio da 404? Te hacemos {found}. Navy ground, cream ink, lilac braces; one browser window that gets fixed."
colors:
  navy: "#1F2A4A"
  navy-2: "#253259"
  navy-deep: "#0F1630"
  cream: "#F2ECDF"
  lila: "#C586C0"
  muted: "#E2DACA"
  line: "#3A4670"
  ink-soft: "#46506E"
  paper: "#FFFFFF"
  code-bg: "#1E1E1E"
  code-var: "#9CDCFE"
  err-on-cream: "#A3261A"
  ok-on-cream: "#1F6B3A"
typography:
  display:
    fontFamily: "Sora, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(40px, 5vw, 76px)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Sora, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(32px, 4.4vw, 58px)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  headline-caption:
    fontFamily: "Sora, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(28px, 3.1vw, 46px)"
    fontWeight: 700
    lineHeight: 1.06
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Sora, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(24px, 2.6vw, 36px)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  title-sm:
    fontFamily: "Sora, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(20px, 2vw, 25px)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Sora, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
  body-lead:
    fontFamily: "Sora, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(17px, 1.4vw, 20px)"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Sora, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.01em"
  label-field:
    fontFamily: "Sora, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 800
    lineHeight: 1.3
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, Cascadia Mono, Consolas, monospace"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1
  mono-code:
    fontFamily: "JetBrains Mono, ui-monospace, Cascadia Mono, Consolas, monospace"
    fontSize: "clamp(12.5px, 1.1vw, 14.5px)"
    fontWeight: 500
    lineHeight: 1.75
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
  editor: "16px"
  row: "14px"
  field: "12px"
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
    typography: "{typography.label}"
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
  link-cta:
    textColor: "{colors.lila}"
    height: "44px"
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
  editor:
    backgroundColor: "{colors.code-bg}"
    textColor: "{colors.cream}"
    typography: "{typography.mono-code}"
    rounded: "{rounded.editor}"
  step-number:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    size: "56px"
  step-number-lit:
    backgroundColor: "{colors.lila}"
    textColor: "{colors.navy}"
  demo-cta:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.cream}"
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

The system is one object and one signature. The object is the browser window from the brand's 404 campaign piece: a thick cream frame, three dots, a mono URL pill and a status tag, sitting on a navy ground. It starts broken (ERROR 404) and gets fixed into real pages and real apps as the visitor scrolls. The signature is the v10 logo's lilac braces: `{ }` are the one accent, and they appear wherever something is chosen, lit, hovered or about to happen. Outside the window the page speaks only navy, cream and lilac; inside it, each trade may bring its own world. The brand is the frame, the client is the content.

The tone is clear, close and capable, never toy-like. Sora carries everything, from the 76px opening question to form labels, so the page reads as one voice; JetBrains Mono and the editor palette appear only when the page shows code or a browser prints something. Density is low on navy: ruled lists, not card grids; one pinned stage, then sections in a single rhythm. Depth is printed, not lit: zero-blur offsets in the darkest ink of the ground. Interaction is generous but quiet: braces close around what you hover, a load bar runs on each page change, the process steps light up as you pass them, and typing your business's name into the 404 makes the whole page about you.

The page closes by flipping the ground: the contact section turns cream with navy ink, so the form reads as the page's own fixed state. The direction contract in `.impeccable/surfaces/index-html.md` still names the old Fredoka/Manrope type and #1E2A4A navy; the shipped v10 build supersedes those values and this file records the build.

**Key Characteristics:**
- Three brand colors in a 60/30/10 split: navy ground, cream ink and chrome, lilac braces and accents.
- Sora for every word on brand surfaces; JetBrains Mono only in code moments and browser chrome.
- The browser window (thick cream frame, dots, mono URL pill, status tag, lilac load bar, hard navy-deep offset) is the signature component.
- Lilac braces as the interaction grammar: menu hover, service-row hover, the "Cotiza con {found}" strip, the software list bullets.
- Code moments (the editor) are the only place #1E1E1E and #9CDCFE appear.
- Pill geometry for every action (999px), soft-rounded frames (22px window, 16px editor, 12px fields).
- Demo worlds (trade palettes and fonts) are contained inside the window viewport and never leak to the brand surface.

## Colors

Navy does the work, cream does the reading, lilac signs; the editor pair exists only where code is on screen.

### Primary
- **Logo Navy** (navy): the page ground everywhere outside the contact section (about 60% of any screen); ink on cream surfaces; the 404 screen and the "tu negocio" screen inside the window; the demo-cta strip at the foot of each demo page; the dots, URL pill border and status tag in the chrome.
- **Bone Cream** (cream): all primary text on navy, the window frame and chrome, primary buttons, the contact section ground, focus outlines on navy, string and number tokens in the editor.

### Secondary
- **Brace Lilac** (lila): the accent, held near 10%. Used for: the braces that fade in around menu links and service names on hover/focus; the service icon stroke and "Cotizar" arrow link on hover; caption "Cotiza" links and the scroll hint; the window's load bar (full) and overall progress fill (40% alpha); the active rail dot; the process track fill and lit step circles; the 404 search ring on focus and the 404 numerals once a business name is typed; the braces in "Cotiza con {found}"; the `{ }` bullets in the software list; editor keywords, the active file tab's top rule and the output prompt; text selection on navy. Washes are capped at 7–8% alpha (service-row hover, 404 search focus).

### Tertiary (code moments only)
- **Editor Ground** (code-bg): the editor window body. Its chrome uses #252526 and #2C2C2C rules; line numbers #6E7681; comments #8B949E italic; plain code #D4D4D4.
- **Editor Sky** (code-var): variable names in the editor and the run output line.

### Neutral
- **Raised Navy** (navy-2): the software and portfolio section grounds and rail tooltips; the only alternate dark surface.
- **Shadow Navy** (navy-deep): exclusively the hard offset under the window, the editor, the folder back boards, the primary-button hover lift and the WhatsApp button.
- **Warm Muted** (muted): secondary text on navy (captions, ledes, list descriptions, nav links at rest, unlit steps). A warm off-cream, not a gray.
- **Rule Navy** (line): hairlines on navy, the header's bottom rule, the 404 search outline at rest, the unlit process track and step rings.
- **Slate Ink** (ink-soft): secondary text on cream (contact copy, optional-field labels).
- **Paper** (paper): the URL pill interior, folder sheets, the form card and inputs; the primary button's hover fill on navy.
- **Kraft** (#D9CCAE front, #CDBE9C back): portfolio folder board only; the "Próximamente" folder swaps to cream with a dashed cream outline.
- **Error Brick** (err-on-cream) and **Success Green** (ok-on-cream): form validation and send status on cream only.

### Named Rules
**The Lilac Signs Rule.** Lilac marks what is chosen, lit, hovered or next; it never fills a surface, a button or a heading. If the lilac grows, it stops being special: washes stay at or under 8% alpha and no screen lets it pass roughly a tenth of the view.

**The Braces Are Always Lilac Rule.** Every `{ }` the brand draws (logo, menu hover, service hover, "Cotiza con {found}", software bullets) is lilac, never cream or navy. Typed running copy such as "Te hacemos {found}." stays in the surrounding ink.

**The Code Moment Rule.** #1E1E1E and #9CDCFE appear only inside the editor component. Navy sections never borrow them.

**The Three-Inks-Outside Rule.** Outside the browser window the page uses only navy, cream, lilac and their listed neutrals. Trade colors exist only inside the window viewport.

**The Halo Is the Only Glow Rule.** The per-chapter radial halo behind the window (60% opacity, color crossfaded over 1s) is the one atmospheric gradient. Its hue follows the chapter (see the sidecar's chapterGlow list).

### Demo Worlds (contained layer, not brand tokens)
Each example inside the window carries its own palette and type and is labeled "Ejemplo ficticio" in the status tag and the demo-cta caption. These values are content, not system; never reuse them on the brand surface.
- **Restaurante:** cream paper #FBF4E8, oxblood #7A1E12, brown ink #3B1A12, mustard badge #F2C14E, sand #F1E2C7; Young Serif. Interactive: menu tabs and a reservation card (round ± guest stepper, hour pills, oxblood confirm).
- **Barbería:** near-black #0E0E0E, bone #EDE6D6, brass #C8A24A; Anton uppercase, mono time slots. Interactive: day and slot booking.
- **Almacén:** warm white #FFFDF6, grocer green #1F6B3A, deep green ink #173B22, yellow #F6C945; Baloo 2. Interactive: add to cart with a bumping cart pill, free-delivery meter and toast.
- **Botillería (app):** ink #0F1419, panel #121A22, card #161E27, border #253041, text #E6EDF3, muted #8B98A5, amber #F2A93B (sell, current-hour bar), green #4CC38A (online dot, success toast), red #F0645A (low-stock alert, #FF8A80 for low counts); system-ui stack, 12px cards, 8px row buttons. Interactive: sell, restock, live KPIs and an hourly bar chart. It is a software UI, deliberately not a website.
- **Banquetería:** blush paper #F6EFE7, plum ink #3A1D2E, card rule #E5D6CC; Bodoni Moda italic. Interactive: quote calculator (event-type pill toggle, guest range, running total, plum pill confirm).
- **Construcción:** concrete #E4E1DB, asphalt #1C1C1C, safety orange #F26B1D, rust #9A3608; Barlow Condensed uppercase, 4px corners. Interactive: an asphalt calculator slab with an orange top rule, work-type toggles, an area range and a large condensed total.

## Typography

**Display Font:** Sora (with system-ui, -apple-system, Segoe UI)
**Body Font:** Sora (same stack)
**Label/Mono Font:** JetBrains Mono (with ui-monospace, Cascadia Mono, Consolas), code moments and browser chrome only

**Character:** One geometric, open family at every scale: Sora Bold for promises (headlines, names), Sora Regular for reading, Sora 600–800 for actions and labels. Tight negative tracking on headings keeps the large sizes firm without feeling corporate; mono is a wink, not a voice.

### Hierarchy
- **Display** (700, clamp(40px, 5vw, 76px), 1, -0.035em): the opening question in the story caption only. Mobile clamp(32px, 9.2vw, 40px).
- **Headline** (700, clamp(32px, 4.4vw, 58px), 1.05, -0.035em): section headings, max about 18ch; the contact heading clamp(34px, 4.4vw, 58px) at 13ch; the software heading clamp(30px, 4vw, 52px).
- **Headline Caption** (700, clamp(28px, 3.1vw, 46px), 1.06, -0.03em): story chapter captions. Mobile clamp(23px, 6.4vw, 28px).
- **Title** (700, clamp(24px, 2.6vw, 36px), 1.1, -0.03em): service names; step names at 24px; folder names 600 clamp(24px, 2.4vw, 30px).
- **Title Small** (600, clamp(20px, 2vw, 25px), 1.2): FAQ questions, service group heads (clamp(20px, 1.8vw, 24px)), the footer claim (22px).
- **Body** (400, 17px, 1.6; 16px under 860px): running text. Measures held at 34 to 60ch.
- **Body Lead** (400, clamp(17px, 1.4vw, 20px)): section ledes in warm muted, max 52ch; the story lede runs clamp(18px, 1.55vw, 22px) in cream.
- **Label** (700, 16px, -0.01em): buttons (14px small); caption and service links 600 15–16px. **Label Field** (800, 15px): form labels; strong inline emphasis uses 800.
- **Mono** (500, 13px): the URL pill (11–11.5px on phones) and the 404 name field. **Mono Code** (500, clamp(12.5px, 1.1vw, 14.5px), 1.75): editor lines, with the file tab at 12.5px and output at 13px. **Mono Tag** (500, 11px, 0.04em, uppercase): the window status tag.

### Named Rules
**The One Family Rule.** Every word on brand surfaces is Sora. A second family appears only as JetBrains Mono inside the editor or the window chrome, or as a demo world's own face inside the window.

**The Mono Means Machine Rule.** JetBrains Mono is for what a machine prints: code lines, file names, URLs, status tags, the 404 search query. Headings, buttons, captions and labels never use it.

**The Balanced Heading Rule.** Every h1 to h3 uses text-wrap: balance; prices, stock and counts use tabular numerals.

## Layout

A single-column scroll with one pinned stage. The story is a sticky 100svh stage inside a tall scroll track whose height is computed from the timeline. On desktop it is a two-column grid (captions minmax(300px, .8fr), window minmax(0, 1.55fr)) with a clamp(28px, 4vw, 72px) gap; the window is capped at 920px wide and min(76svh, 700px) tall. Under 860px the stage stacks: a short caption at the top (caption buttons hidden, only the lilac "Cotiza" link remains), the window filling the remaining height. A fixed dot rail appears at 1100px and up.

Below the story, sections share one rhythm: vertical padding clamp(80px, 11vw, 150px), a 1200px container with a clamp(16px, 4vw, 56px) gutter, and a section head (headline plus lede, no label above) separated from content by clamp(40px, 6vw, 72px). Order: services (two ruled lists), software (copy plus editor, raised navy), portfolio (folders, raised navy), process (four steps), FAQ, contact (cream), footer. Grids widen at 860 to 980px: services rows to four columns, folders to three, steps to four across, software, FAQ and contact to two-column splits with the copy side sticky.

The header is fixed, 64px (58px on mobile), navy with a 1px line rule beneath. Inside the window, demo pages respond to the window's own width via a container query at 560px, never to the viewport.

## Elevation & Depth

Depth is printed, not lit. The system uses zero-blur offsets toward the lower right in the darkest ink of the surrounding ground. Surfaces at rest on navy are flat; the window, the editor and the folders are the only permanently raised objects. Tonal layering (navy to raised navy) separates the software and portfolio sections. Logo files are never shadowed; the offset belongs to the window and its siblings, not to the mark.

### Shadow Vocabulary
- **Window offset** (`box-shadow: 10px 12px 0 0 #0F1630`; under 860px `6px 7px 0 0 #0F1630`): the story window and the editor.
- **Folder offset** (`box-shadow: 8px 10px 0 0 #0F1630`): the folder back board.
- **Form card offset** (`box-shadow: 10px 12px 0 0 #1F2A4A`; under 860px `6px 7px 0 0`): the form on cream, where navy is the darkest ink.
- **Button lift** (`box-shadow: 4px 5px 0 0 #0F1630` with `translate(-2px, -2px)`): primary hover on navy; on cream the lift uses #9AA3BD. Presses flat on active.
- **Sheet reveal** (`box-shadow: 0 -18px 40px rgba(8,12,28,.42)` fading to 0, with 26px top corners easing to 0): the only blurred shadow, a transient on the incoming page during a window navigation.

### Named Rules
**The Printed Offset Rule.** Shadows are solid offsets in the darkest ink of the ground (navy-deep on navy, navy on cream). No blur radius on resting brand surfaces.

**The Flat Until Touched Rule.** Buttons are flat at rest; the offset appears only as a hover lift and disappears on press. With a fine pointer, cream primary buttons also follow the cursor a few pixels (magnet), never under reduced motion.

## Shapes

Rounded and friendly, never sharp. Every action and token-like element is a full pill (999px): buttons, chips, URL pills, status tags, the 404 search field, folder tags. Frames step down by scale: the story window 22px (18px on mobile) with a 5px cream border (4px on mobile) and a 16px inner viewport corner; the editor 16px with a 1px #2C2C2C rule; the form card 22px with a 3px navy border; service rows 14px on hover; fields 12px. Folders have a tab (14px/18px top corners) and a 4px/18px back board. Circles mark sequence and state: 56px step numbers, rail dots, the FAQ plus toggle, window dots. Borders are thick (2px interactive outlines, 3–5px frames) to match the logo's heavy stroke. Icons are inline SVG with round caps at a 2.4 stroke.

## Components

### Buttons
Tactile and round: a cream pill that lifts like a sticker.
- **Shape:** full pill (999px), 52px tall (44px small), 2px border slot.
- **Primary:** cream fill, navy label, Sora 700 16px, 0 26px padding.
- **Hover / Focus:** fill goes to paper white, translates (-2px, -2px) and gains the navy-deep lift; press returns flat. Focus is a 2px cream outline at 3px offset. Transitions 0.2s on cubic-bezier(.16, 1, .3, 1).
- **On cream:** in the contact section the primary inverts to a navy fill with cream label.
- **Outline:** transparent with a 2px currentColor border; hover fills with the opposite ink.

### Lilac Link CTA
The quiet "¿Quieres una así? Cotiza →" under each story caption and the "Cotizar" link on service rows: lilac Sora 600 15–16px, 44px tap height, a stroked arrow that slides 5px right on hover. Every one carries the trade and service into the form.

### Chips
- **Style:** trade chips in the final chapter are 44px cream-outlined pills, Sora 700, linking to the form with the trade preselected.
- **State:** hover fills cream with navy text.

### Cards / Containers
- **Corner Style:** cards are avoided on navy; the containers are the window (22px), the editor (16px), folders and the form card (22px).
- **Background:** cream frame around content; code ground for the editor; paper for the form.
- **Shadow Strategy:** Printed Offset Rule (see Elevation & Depth).
- **Border:** 3 to 5px, cream on navy, navy on cream; 1px #2C2C2C on the editor.
- **Internal Padding:** form clamp(20px, 3.4vw, 36px).

### Inputs / Fields
- **Style:** paper fill, 2px #C9C3B4 stroke, 12px radius, 50px minimum height, 16px navy text, visible Sora 800 15px labels above.
- **Focus:** border shifts to navy plus a 3px navy outline at 22% opacity.
- **Error / Disabled:** error brick border and a 14px 700 message beneath; disabled submit drops to 55% opacity.
- **404 name field:** a line-ruled pill inside the 404 screen (mono query, search glyph); on focus the ring turns lilac over an 8% lilac wash.

### Navigation
- **Header:** fixed navy bar, v10 horizontal logo left (34px tall, 28–32px on phones), Sora 600 15px links in muted. On hover or focus the link turns cream and lilac braces slide 6px inward and fade in around it. A small primary pill closes the bar. Links hide under 980px.
- **Rail:** at 1100px and up, 10px cream-ring dots on the right mark story chapters; the active dot fills lilac and scales 1.2; labels appear on hover/focus in a raised-navy tooltip.

### Browser Window (signature)
The campaign piece's window, scaled up. Cream frame and chrome; three 12px dots (first filled navy, others navy rings); a paper URL pill with a CSS-drawn lock, mono text typed letter by letter and a blinking caret; a navy mono status tag ("Sin página", "Ejemplo ficticio", "Tu turno"); a 3px overall-progress line in 40% lilac and a full lilac load bar. Each page change plays as a navigation: the URL types and the load bar runs, then the new page rises as a sheet (yPercent 100→0, power3.inOut) while the outgoing page recedes (scale 0.95, -5%, opacity 0.5); inner pages scroll with the scrub (0.9) and a snap completes or undoes a half-finished change. The halo behind the window takes each chapter's hue.
- **Personalised 404:** typing a business name in the 404 field rewrites the URL to its slug .cl, the heading to "“Nombre” no aparece", turns the 404 numerals lilac, and carries the name to the final chapter and the form.
- With reduced motion or no JS, every page renders in final state, stacked in order.

### Demo CTA Strip
A navy band closing every demo page inside the window: a muted line ("¿Quieres una así para tu negocio?"), then Sora 700 1.3em "Cotiza con {found} →" with lilac braces and an arrow that slides on hover, then the "Sitio de ejemplo ficticio creado por {found} studio" caption. It is the brand stepping back into the window, so it uses brand tokens even inside a demo world.

### Code Moment (Editor)
The software section's editor: a code-ground window with a #252526 bar, grey dots, a file tab topped by a 2px lilac rule, numbered lines (CSS counter) in JetBrains Mono at 1.75 line height. Syntax: keywords lilac, variables sky, strings and numbers cream, function names cream bold, comments grey italic. When scrolled into view the lines type in one by one (260ms stagger, 8px slide), ending on a sky output line with a lilac prompt. The adjacent list uses lilac mono `{ }` bullets.

### Process Steps (lit)
Four steps on a track. A 2px line-navy track runs behind 56px circles (navy fill, line ring, muted numeral); as the section scrolls, the track fills lilac and each step it reaches lights: circle fills lilac with navy numeral and scales 1.08, title turns cream, text reaches full opacity. Vertical on phones, horizontal at 900px. With no JS or reduced motion every step renders lit.

### Ruled List (services, FAQ)
Editorial lists instead of card grids: a 2px cream rule on top, 1px line rules between items. Service rows: stroked 48px icon, Sora title, muted description and a "Cotizar" link that appears on hover at desktop; on hover the row takes a 7% lilac wash, the icon stroke turns lilac and tilts -6deg, and lilac braces close around the service name. FAQ rows use a circular CSS plus toggle that rotates 45deg when open.

### Portfolio Folder
A kraft folder (tab top-left, back board with the navy-deep offset) holding a paper sheet that shows the client's domain in a small URL pill. Hover or focus tilts the front flap back (rotateX -16deg) and lifts the sheet 26px; the whole folder links to the client's site. Folders without a real link render as a non-link block labeled "Link pendiente". The last folder, "Próximamente: tu negocio", is cream with a dashed outline and links to the contact form.

## Do's and Don'ts

### Do:
- **Do** hold the 60/30/10 split: navy ground, cream ink and chrome, lilac only for braces, lit states and accents.
- **Do** draw every brand brace in lilac and use the braces as the hover/selection grammar (menu, service rows, "Cotiza con {found}").
- **Do** use the v10 logo files (assets/brand copies of found-logo/v10-final) exactly as supplied, on navy or cream only.
- **Do** set every word on brand surfaces in Sora; headings 700 with negative tracking and text-wrap: balance.
- **Do** keep JetBrains Mono, #1E1E1E and #9CDCFE to the editor and the window chrome.
- **Do** render depth as a zero-blur offset in navy-deep (10px 12px on the window and editor, 4px 5px on button hover).
- **Do** make every action a pill or a lilac link of at least 44px height that carries the trade and service into the form.
- **Do** label every demo world "Ejemplo ficticio" and close it with the navy demo-cta strip.
- **Do** give every story state, lit step and typed editor line a no-JS and reduced-motion final form.

### Don't:
- **Don't** fill buttons, headings or surfaces with lilac, or let lilac washes exceed 8% alpha.
- **Don't** stretch, rotate, recolor, outline, shadow or gradient the logo; don't place it on anything but navy or cream.
- **Don't** let a demo world's palette or font (Young Serif, Anton, Baloo 2, Bodoni Moda, Barlow Condensed, the botillería system-ui app palette) appear outside the browser window.
- **Don't** use JetBrains Mono for captions, labels, tags or headings outside code and browser chrome.
- **Don't** add blurred drop shadows to resting brand surfaces; the offset is the only shadow.
- **Don't** add a second atmospheric gradient; the chapter halo is the only glow.
- **Don't** build icon-title-text card grids on navy; services, steps and FAQ are ruled or tracked lists.
- **Don't** pin more than one section; the story stage is the single pin.
- **Don't** put small labels or eyebrows above headings; section heads are headline plus lede.
