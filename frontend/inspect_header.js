const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/work');
  await page.waitForTimeout(2000);
  const badgeInfo = await page.evaluate(() => {
    const el = document.querySelector('[aria-label="Online"]') || document.querySelector('[aria-label="Offline"]');
    if (!el) return { found: false };
    const rect = el.getBoundingClientRect();
    const computed = window.getComputedStyle(el);
    return {
      found: true,
      outerHTML: el.outerHTML,
      innerText: el.innerText,
      width: rect.width,
      height: rect.height,
      color: computed.color,
      bgColor: computed.backgroundColor,
      children: Array.from(el.children).map(c => ({
        tag: c.tagName,
        className: c.className,
        rect: c.getBoundingClientRect(),
        text: c.textContent,
        styles: {
          display: window.getComputedStyle(c).display,
          width: window.getComputedStyle(c).width,
          height: window.getComputedStyle(c).height,
          bgColor: window.getComputedStyle(c).backgroundColor,
          color: window.getComputedStyle(c).color,
        }
      }))
    };
  });
  console.log(JSON.stringify(badgeInfo, null, 2));
  await page.screenshot({ path: 'test-evidence/header_debug.png' });
  await browser.close();
})();
