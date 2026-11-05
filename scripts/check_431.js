const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('response', res => {
    if (res.status() === 431) {
      console.log('431 on URL:', res.url());
    }
  });

  await page.goto('http://localhost:3000/clients/new');
  await page.waitForTimeout(2000);

  const cookies = await context.cookies();
  console.log('Cookies count:', cookies.length);
  cookies.forEach(c => console.log('Cookie:', c.name, 'length:', c.value.length));

  await browser.close();
})();
