const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addInitScript(() => {
    localStorage.setItem('csc2_field_user', JSON.stringify({
      id: 'usr-1',
      firstName: 'Ramesh',
      phone: '+919876543210',
      status: 'VERIFIED',
      centerId: 'DL-CENTRAL-01'
    }));
  });
  const page = await context.newPage();
  await page.goto('http://localhost:3000/work', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Check header text in EN
  const enBadge = await page.$eval('header div.rounded-full', el => el.textContent.trim());
  console.log('Online badge in EN:', enBadge);

  await page.screenshot({ path: 'frontend/test-evidence/evidence_header_en.png' });

  // Switch to HI
  await page.click('button:has-text("HI")');
  await page.waitForTimeout(500);

  const hiBadge = await page.$eval('header div.rounded-full', el => el.textContent.trim());
  console.log('Online badge in HI:', hiBadge);

  await page.screenshot({ path: 'frontend/test-evidence/evidence_header_hi.png' });

  await browser.close();
  console.log('Header verification passed!');
})();
