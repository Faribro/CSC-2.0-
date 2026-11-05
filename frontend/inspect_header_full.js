const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/work');
  await page.waitForTimeout(2000);
  const rightControls = await page.evaluate(() => {
    const header = document.querySelector('header');
    if (!header) return 'No header';
    return header.innerHTML;
  });
  console.log(rightControls);
  await browser.close();
})();
