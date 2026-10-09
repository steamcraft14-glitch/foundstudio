// Fotogramas de un cambio de sitio (almacén → banquetería) para revisar la transición.
async page => {
  const out = [];
  for (const [tag, w, h] of [["escritorio", 1440, 900], ["celular", 390, 844]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("http://localhost:8417/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const z = await page.evaluate(() => {
      const st = ScrollTrigger.getAll().find(s => s.trigger && s.trigger.id === "story"), tl = st.animation;
      window.__tl = tl; st.kill(false);
      // busca la zona de transición hacia la banquetería (capítulo 4)
      let a = null, b = null;
      for (let t = 0; t < tl.duration(); t += 0.05) { tl.time(t); const c = document.querySelector(".cap.is-on").dataset.cap; if (c === "4" && a === null) a = t - 0.2; }
      return a;
    });
    for (const f of [0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.25]) {
      await page.evaluate(t => { window.__tl.time(t); }, z + f);
      await page.waitForTimeout(700);
      const file = `tests/screens/transicion-${tag}-${String(f).replace(".", "_")}.png`;
      await page.screenshot({ path: file, clip: w > 500 ? { x: 520, y: 110, width: 900, height: 740 } : undefined });
      out.push(file);
    }
  }
  return out.join("\n");
}
