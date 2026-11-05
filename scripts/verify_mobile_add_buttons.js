const path = require('path');
module.paths.push(path.resolve(__dirname, '../frontend/node_modules'));
const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  const artifactDir = 'C:\\Users\\fsayyed\\.gemini\\antigravity\\brain\\659ab4b7-0573-4914-b69a-94628454d01b\\ui_verification';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  console.log('Navigating to http://localhost:3000/clients/new ...');
  await page.goto('http://localhost:3000/clients/new', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Take screenshot of the top
  await page.screenshot({ path: path.join(artifactDir, '12_mobile_registration_top.png') });
  console.log('Saved 12_mobile_registration_top.png');

  // Scroll to B2 Family Members
  const b2Header = page.locator('text=B2. Family Members & Dependents');
  if (await b2Header.count() > 0) {
    await b2Header.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, '13_mobile_b2_family_section.png') });
    console.log('Saved 13_mobile_b2_family_section.png');
  }

  // Scroll to D5 Referrals
  const d5Header = page.locator('text=D5. Referral Requests');
  if (await d5Header.count() > 0) {
    await d5Header.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, '14_mobile_d5_referrals_section.png') });
    console.log('Saved 14_mobile_d5_referrals_section.png');
  }

  // Scroll to J5 Services
  const j5Header = page.locator('text=J5. Planned Follow-Up Services');
  if (await j5Header.count() > 0) {
    await j5Header.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, '15_mobile_j5_services_section.png') });
    console.log('Saved 15_mobile_j5_services_section.png');
  }

  await browser.close();
  console.log('All mobile screenshots captured successfully.');
})();
