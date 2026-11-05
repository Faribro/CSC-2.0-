const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto('http://localhost:3000/work');
  await page.waitForTimeout(2000);

  const wifiInfo = await page.evaluate(() => {
    const el = document.querySelector('[aria-label="Online"]') || document.querySelector('[aria-label="Offline"]');
    if (!el) return { found: false };
    const svg = el.querySelector('svg');
    return {
      found: true,
      ariaLabel: el.getAttribute('aria-label'),
      title: el.getAttribute('title'),
      hasText: el.textContent?.trim() || '',
      width: el.offsetWidth,
      height: el.offsetHeight,
      svgClass: svg?.getAttribute('class') || '',
      svgHtml: svg?.outerHTML || ''
    };
  });
  console.log('Wifi indicator info:', JSON.stringify(wifiInfo, null, 2));

  // Take screenshot of header area
  await page.screenshot({ path: 'test-evidence/40_header_wifi_indicator.png' });
  console.log('Captured test-evidence/40_header_wifi_indicator.png');

  await browser.close();
})();
