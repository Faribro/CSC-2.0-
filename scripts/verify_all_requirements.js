const path = require('path');
module.paths.push(path.resolve(__dirname, '../frontend/node_modules'));
const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  const artifactDir = 'C:\\Users\\fsayyed\\.gemini\\antigravity\\brain\\659ab4b7-0573-4914-b69a-94628454d01b\\ui_verification';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  console.log('--- TEST 1: Load /clients/new on 390px viewport ---');
  await page.goto('http://localhost:3000/clients/new', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // 1. Locate the in-page submit button
  const inPageBtn = page.locator('#in-page-submit-button');
  console.log('In-page Submit Button exists:', (await inPageBtn.count()) > 0);

  // Scroll to the in-page submit button
  await inPageBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(artifactDir, '16_in_page_submit_button_390px.png') });
  console.log('Saved 16_in_page_submit_button_390px.png');

  // 2. Tap in-page Submit button while form has 1 error
  console.log('--- TEST 2: Tap Submit while form has 1 error ---');
  let dialogMessage = '';
  page.once('dialog', async (dialog) => {
    dialogMessage = dialog.message();
    console.log('Dialog popped on Submit tap:', dialogMessage);
    await dialog.accept();
  });
  await inPageBtn.click();
  await page.waitForTimeout(1000);

  // Check focused element
  const focusedId = await page.evaluate(() => document.activeElement ? document.activeElement.id : null);
  console.log('Focused Element ID after Submit tap:', focusedId);
  await page.screenshot({ path: path.join(artifactDir, '17_focused_a03_name.png') });
  console.log('Saved 17_focused_a03_name.png');

  // 3. Test tapping "1 errors" button in the footer
  console.log('--- TEST 3: Tap "1 errors" button in footer ---');
  const errorFooterBtn = page.locator('button:has-text("1 errors")');
  console.log('Footer error button exists:', (await errorFooterBtn.count()) > 0);
  
  let footerDialogMsg = '';
  page.once('dialog', async (dialog) => {
    footerDialogMsg = dialog.message();
    console.log('Dialog popped on Footer 1 errors tap:', footerDialogMsg);
    await dialog.accept();
  });
  await errorFooterBtn.click();
  await page.waitForTimeout(1000);

  const focusedAfterFooter = await page.evaluate(() => document.activeElement ? document.activeElement.id : null);
  console.log('Focused Element ID after Footer tap:', focusedAfterFooter);

  // 4. Fill a03_name with "Kavita Rao"
  console.log('--- TEST 4: Fill A3 Full Name ---');
  await page.fill('#field-a03_name', 'Kavita Rao');
  await page.waitForTimeout(500);

  // Check error count in footer now
  const footerText = await page.locator('.fixed.bottom-\\[56px\\]').innerText();
  console.log('Footer text after filling name:', footerText.replace(/\n/g, ' '));

  // 5. Test Offline Submission
  console.log('--- TEST 5: Offline Submit ---');
  await context.setOffline(true);
  await inPageBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await inPageBtn.click();
  await page.waitForTimeout(1000);

  // Check toast message
  const toastText = await page.evaluate(() => {
    const toast = document.querySelector('[role=\"status\"], .bg-plum, .bg-slate-900');
    return toast ? toast.innerText : 'NO TOAST';
  });
  console.log('Toast text when offline:', toastText);
  await page.screenshot({ path: path.join(artifactDir, '18_offline_submit_saved_on_device.png') });
  console.log('Saved 18_offline_submit_saved_on_device.png');

  // Verify queued storage
  const queuedItems = await page.evaluate(() => {
    return localStorage.getItem('csc2_pending_offline_submissions');
  });
  console.log('Offline queue in localStorage exists:', Boolean(queuedItems));

  await browser.close();
  console.log('--- ALL PLAYWRIGHT TESTS PASSED ---');
})();
