// scripts/verify_qr_upload_ui.js
const path = require('path');
const fs = require('fs');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright'));
const QRCode = require(path.resolve(__dirname, '../frontend/node_modules/qrcode'));

async function main() {
  console.log('--- Starting QR Code Upload & Verification Playwright Test ---');

  // Pre-generate test QR code image
  const qrImagePath = path.resolve(__dirname, '../frontend/test_qr.png');
  await QRCode.toFile(qrImagePath, 'CSC2-MH-8A4F102B4C5D6E7F');
  console.log('Generated test QR image at:', qrImagePath);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });

  // Ensure clean session before app loads
  await context.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  const page = await context.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err));

  const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
  console.log(`Navigating to ${BASE_URL}/work...`);
  await page.goto(`${BASE_URL}/work`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000); // Allow React hydration and ClientOnly mount

  // 1. Open Field Worker Access Modal by clicking Start New Registration when unauthenticated
  console.log('Clicking Start New Registration button on /work...');
  const startRegBtn = page.locator('a[aria-label="Start New Registration"]');
  await startRegBtn.waitFor({ state: 'visible', timeout: 8000 });
  await startRegBtn.click();
  await page.waitForTimeout(1000);
  console.log('Current URL after click:', page.url());
  const dialogCount = await page.evaluate(() => document.querySelectorAll('div[role="dialog"]').length);
  console.log('Dialog count in DOM:', dialogCount);
  const bodyHtml = await page.evaluate(() => document.body.innerHTML.slice(0, 500));
  console.log('Body HTML snippet:', bodyHtml);

  // 2. Verify Initial Modal State (Buttons for Upload QR Image & Scan with Camera)
  const modal = page.locator('div[role="dialog"]');
  await modal.waitFor({ state: 'visible', timeout: 5000 });

  const uploadBtn = modal.locator('button:has-text("Upload QR Image")');
  const cameraBtn = modal.locator('button:has-text("Scan with Camera")');
  const manualToggle = modal.locator('button:has-text("Or type token code manually")');

  if (await uploadBtn.count() === 0 || await cameraBtn.count() === 0) {
    throw new Error('Upload QR Image or Scan with Camera button missing in modal!');
  }
  console.log('PASSED: Upload QR Image and Scan with Camera buttons are visible.');

  const artifactsDir = 'C:/Users/fsayyed/.gemini/antigravity/brain/659ab4b7-0573-4914-b69a-94628454d01b/ui_verification';
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const screenshot1 = path.join(artifactsDir, '25_field_worker_qr_modal_initial_390px.png');
  await modal.screenshot({ path: screenshot1 });
  console.log(`Saved: ${screenshot1}`);

  // 3. Upload QR Code Image
  console.log(`Uploading test QR image from: ${qrImagePath}...`);
  const fileInput = modal.locator('input[type="file"]');
  await fileInput.setInputFiles(qrImagePath);

  // 4. Verify Accepted State
  await page.waitForTimeout(1500);
  const acceptedBanner = modal.locator('text=QR Code Accepted');
  const isAccepted = await acceptedBanner.isVisible();
  if (!isAccepted) {
    const modalText = await modal.innerText();
    console.log('MODAL INNER TEXT ON UPLOAD ATTEMPT:\n', modalText);
  }
  await acceptedBanner.waitFor({ state: 'visible', timeout: 5000 });

  const tokenText = await modal.locator('text=CSC2-MH-8A4F102B4C5D6E7F').textContent();
  console.log(`PASSED: Decoded token detected: "${tokenText}"`);

  const stateBadge = modal.locator('text=State: MH');
  await stateBadge.waitFor({ state: 'visible', timeout: 3000 });
  console.log('PASSED: State badge (State: MH) correctly displayed.');

  const screenshot2 = path.join(artifactsDir, '26_field_worker_qr_modal_accepted_390px.png');
  await modal.screenshot({ path: screenshot2 });
  console.log(`Saved: ${screenshot2}`);

  // 5. Verify "Change Code" clears token and restores buttons
  const changeBtn = modal.locator('button:has-text("Change Code")');
  await changeBtn.click();
  await page.waitForTimeout(500);

  await uploadBtn.waitFor({ state: 'visible', timeout: 3000 });
  console.log('PASSED: Clicking "Change Code" successfully restored upload/camera options.');

  // 6. Verify Manual Input Expander
  await manualToggle.click();
  await page.waitForTimeout(300);
  const manualInput = modal.locator('input[placeholder="e.g. CSC2-MH-8A4F102B..."]');
  await manualInput.waitFor({ state: 'visible', timeout: 3000 });
  await manualInput.fill('CSC2-DL-FEDCBA9876543210');

  const screenshot3 = path.join(artifactsDir, '27_field_worker_qr_modal_manual_390px.png');
  await modal.screenshot({ path: screenshot3 });
  console.log(`Saved: ${screenshot3}`);

  if (fs.existsSync(qrImagePath)) {
    fs.unlinkSync(qrImagePath);
  }
  await browser.close();
  console.log('--- ALL QR CODE UPLOAD UI CHECKS PASSED SUCCESSFULLY ---');
}

main().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
