// Capturas en reposo de cada capítulo y sección:
//   playwright-cli run-code --filename=tests/capturas.js
async page => {
  const BASE = "http://localhost:8417/";
  const done = [];
  for (const [tag, w, h] of [["celular", 390, 844], ["escritorio", 1440, 900]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    // rango de scroll de cada capítulo
    const ranges = await page.evaluate(async () => {
      document.documentElement.style.scrollBehavior = "auto";
      const total = document.querySelector("#story").offsetHeight - innerHeight;
      const r = {};
      for (let y = 0; y <= total; y += 20) {
        scrollTo(0, y);
        await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
        const k = document.querySelector(".cap.is-on").dataset.cap;
        (r[k] ||= [y, y])[1] = y;
      }
      return r;
    });
    const names = ["404", "restaurante", "barberia", "almacen", "banqueteria", "construccion", "tu-negocio"];
    for (const [k, [a, b]] of Object.entries(ranges)) {
      const f = k === "0" ? 0 : k === "6" ? 0.9 : 0.42;
      await page.evaluate(y => scrollTo(0, y), Math.round(a + (b - a) * f));
      await page.waitForTimeout(1600);
      const file = `tests/screens/final-${tag}-${k}-${names[k]}.png`;
      await page.screenshot({ path: file });
      done.push(file);
    }
    for (const id of ["servicios", "portafolio", "proceso", "preguntas", "contacto"]) {
      await page.evaluate(id => document.getElementById(id).scrollIntoView(), id);
      await page.waitForTimeout(1100);
      const file = `tests/screens/final-${tag}-s-${id}.png`;
      await page.screenshot({ path: file });
      done.push(file);
    }
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(900);
    await page.screenshot({ path: `tests/screens/final-${tag}-z-pie.png` });
    // página completa para la revisión de diseño
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(600);
    await page.screenshot({ path: `.impeccable/review/${tag === "celular" ? "mobile" : "desktop"}.png`, fullPage: true });
  }
  return done.length + " capturas";
}
