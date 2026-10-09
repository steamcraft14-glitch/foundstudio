// Capturas de los estados interactivos nuevos (hover de servicios, editor, pasos, nombre del negocio).
async page => {
  const set = async (w, h) => { await page.setViewportSize({ width: w, height: h }); await page.goto("http://localhost:8417/", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(2200); await page.evaluate(() => document.documentElement.style.scrollBehavior = "auto"); };
  await set(1440, 900);
  await page.fill("#biz", "Botillería Don Pepe"); await page.waitForTimeout(500);
  await page.screenshot({ path: "docs/v2-nombre-escritorio.png" });
  await page.evaluate(() => document.querySelector(".svc[data-servicio='software']").scrollIntoView({ block: "center" })); await page.waitForTimeout(1200);
  await page.hover(".svc[data-servicio='software']"); await page.waitForTimeout(700);
  await page.screenshot({ path: "docs/v2-servicios-hover.png" });
  await page.evaluate(() => document.getElementById("software").scrollIntoView()); await page.waitForTimeout(3500);
  await page.screenshot({ path: "docs/v2-software.png" });
  await page.evaluate(() => { const r = document.querySelector(".steps-wrap").getBoundingClientRect(); scrollTo(0, scrollY + r.top - innerHeight * 0.45); }); await page.waitForTimeout(900);
  await page.screenshot({ path: "docs/v2-proceso.png" });
  await set(390, 844);
  await page.fill("#biz", "Botillería Don Pepe"); await page.waitForTimeout(500);
  await page.screenshot({ path: "docs/v2-nombre-celular.png" });
  return "ok";
}
