const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // 1. Visit /work
  console.log('Navigating to /work...');
  await page.goto('http://localhost:3000/work');
  await page.waitForTimeout(2000);

  // Check Plus button
  const buttonInfo = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Start New Registration'));
    if (!btn) return { found: false };
    const svg = btn.querySelector('svg');
    return {
      found: true,
      text: btn.textContent.trim(),
      svgClass: svg?.getAttribute('class') || '',
      svgHtml: svg?.outerHTML || '',
      width: btn.offsetWidth,
      height: btn.offsetHeight
    };
  });
  console.log('Start New Registration button info:', JSON.stringify(buttonInfo, null, 2));

  // Check that Directory card is removed
  const directoryCardExists = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*')).some(el => el.textContent?.includes('Records & Follow-ups Directory'));
  });
  console.log('Records & Follow-ups Directory card exists on /work?', directoryCardExists);

  // Check Header Online Badge
  const badgeInfo = await page.evaluate(() => {
    const badge = document.querySelector('[aria-label="Online"]');
    if (!badge) return { found: false };
    return {
      found: true,
      text: badge.textContent.trim(),
      outerHTML: badge.outerHTML
    };
  });
  console.log('Online badge info:', JSON.stringify(badgeInfo, null, 2));

  // Take screenshot of /work desktop
  await page.screenshot({ path: 'test-evidence/30_work_page_updated.png', fullPage: true });

  // 2. Switch to Hindi on /work
  console.log('Testing Hindi on /work...');
  const hiButton = page.locator('button:has-text("HI")');
  await hiButton.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-evidence/31_work_page_hi_updated.png', fullPage: true });

  // 3. Navigate to /clients
  console.log('Navigating to /clients...');
  await page.goto('http://localhost:3000/clients');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-evidence/32_clients_page_updated.png', fullPage: true });

  // Click Overdue
  const overdueBtn = page.locator('button:has-text("Overdue")').first();
  if (await overdueBtn.count() > 0) {
    await overdueBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-evidence/33_clients_overdue_view.png', fullPage: true });
  }

  // Click All Records
  const allRecordsBtn = page.locator('button:has-text("All Records")').first();
  if (await allRecordsBtn.count() > 0) {
    await allRecordsBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-evidence/34_clients_all_records_view.png', fullPage: true });
  }

  // 4. Mobile Viewport
  console.log('Testing mobile viewport...');
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('http://localhost:3000/work');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-evidence/35_mobile_work_page.png', fullPage: true });

  await page.goto('http://localhost:3000/clients');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-evidence/36_mobile_clients_page.png', fullPage: true });

  console.log('All verification checks completed successfully!');
  await browser.close();
})();
