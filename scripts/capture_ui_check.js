const path = require('path');
module.paths.push(path.resolve(__dirname, '../frontend/node_modules'));
const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const evidenceDir = path.resolve(__dirname, '../frontend/test-evidence/ui_verification');
  const artifactDir = 'C:\\Users\\fsayyed\\.gemini\\antigravity\\brain\\659ab4b7-0573-4914-b69a-94628454d01b\\ui_verification';

  [evidenceDir, artifactDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const saveBoth = async (locatorOrPage, filename) => {
    const file1 = path.join(evidenceDir, filename);
    const file2 = path.join(artifactDir, filename);
    await locatorOrPage.screenshot({ path: file1 });
    fs.copyFileSync(file1, file2);
  };

  // 1. Check /work desktop
  console.log('Navigating to /work desktop...');
  await page.goto('http://localhost:3000/work', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await saveBoth(page, '01_work_desktop.png');

  // 2. Check header wifi icon crop
  const header = page.locator('header');
  await saveBoth(header, '02_header_wifi_crop.png');

  // 3. Check Start Registration button crop
  const plusBtn = page.locator('a[href="/clients/new"]');
  if (await plusBtn.count() > 0) {
    await saveBoth(plusBtn.first(), '03_plus_button_crop.png');
  }

  // 4. Check /clients desktop
  console.log('Navigating to /clients desktop...');
  await page.goto('http://localhost:3000/clients', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await saveBoth(page, '04_clients_desktop.png');

  // 5. Check /clients today view
  const todayBtn = page.locator('button:has-text("Today")').first();
  if (await todayBtn.count() > 0) {
    await todayBtn.click();
    await page.waitForTimeout(500);
    await saveBoth(page, '05_clients_today_view.png');
  }

  // 6. Check /clients all records view
  const allRecordsBtn = page.locator('button:has-text("All Records")').first();
  if (await allRecordsBtn.count() > 0) {
    await allRecordsBtn.click();
    await page.waitForTimeout(500);
    await saveBoth(page, '06_clients_all_records_view.png');
  }

  // 7. Mobile views
  console.log('Switching to mobile viewport (375x667)...');
  await page.setViewportSize({ width: 375, height: 667 });

  await page.goto('http://localhost:3000/work', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await saveBoth(page, '07_work_mobile.png');

  await page.goto('http://localhost:3000/clients', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await saveBoth(page, '08_clients_mobile.png');

  await browser.close();
  console.log('All screenshots captured and saved to both directories successfully!');
})();
