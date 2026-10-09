// Si el CDN de GSAP falla, la historia se muestra completa y estática.
async page => {
  await page.route("https://cdnjs.cloudflare.com/**", r => r.abort());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:8417/", { waitUntil: "load" });
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => ({
    js: document.documentElement.classList.contains("js"),
    visibles: [...document.querySelectorAll(".skin")].filter(s => getComputedStyle(s).clipPath === "none" && s.getBoundingClientRect().height > 200).length,
    hscroll: document.documentElement.scrollWidth > innerWidth
  }));
  await page.screenshot({ path: "tests/screens/sin-gsap-celular.png", fullPage: true });
  await page.unroute("https://cdnjs.cloudflare.com/**");
  return JSON.stringify(r);
}
