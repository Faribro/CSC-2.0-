const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('Hydration')) {
      errors.push(msg.text());
    }
  });

  // Inject bis_skin_checked before scripts run, exactly like the user's extension
  await page.addInitScript(() => {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) {
            node.setAttribute('bis_skin_checked', '1');
          }
        }
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  });

  await page.goto('http://localhost:3000/clients/new', { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  console.log('Console errors captured:', errors.length);
  errors.forEach(e => console.log('  ->', e.substring(0, 120)));

  await browser.close();
})();
