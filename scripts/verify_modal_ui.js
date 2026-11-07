// scripts/verify_modal_ui.js
const { chromium } = require('playwright');
const path = require('path');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
  console.log(`Navigating to ${BASE_URL}...`);
  await page.goto(`${BASE_URL}/clients/new`, { waitUntil: 'load', timeout: 15000 });

  // 1. Capture Form view (single row footer + no top header)
  await page.waitForSelector('#section-A', { timeout: 10000 });
  const screenshot1Path = path.resolve('C:/Users/fsayyed/.gemini/antigravity/brain/659ab4b7-0573-4914-b69a-94628454d01b/ui_verification/22_live_form_single_row_no_header.png');
  await page.screenshot({ path: screenshot1Path });
  console.log('Saved 22_live_form_single_row_no_header.png');

  // 2. Open Evaluation Login Modal
  console.log('Opening Evaluation modal...');
  const evalTab = page.locator('button:has-text("Evaluation")');
  if (await evalTab.count() > 0) {
    await evalTab.first().click();
    await page.waitForTimeout(500);

    // Switch to Work Email Sign Up tab
    const signUpSubTab = page.locator('button:has-text("Work Email Sign Up")');
    if (await signUpSubTab.count() > 0) {
      await signUpSubTab.click();
      await page.waitForTimeout(500);
    }

    const screenshot2Path = path.resolve('C:/Users/fsayyed/.gemini/antigravity/brain/659ab4b7-0573-4914-b69a-94628454d01b/ui_verification/23_state_team_signup_2step_modal.png');
    await page.screenshot({ path: screenshot2Path });
    console.log('Saved 23_state_team_signup_2step_modal.png');
  }

  // 3. Open Field Caseworker Login Modal
  console.log('Checking Field Phone Verification modal...');
  await page.goto(`${BASE_URL}/work`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  const verifyBtn = page.locator('button:has-text("Verify Phone Number"), button:has-text("Caseworker Sign In")');
  if (await verifyBtn.count() > 0) {
    await verifyBtn.first().click();
    await page.waitForTimeout(500);
    const screenshot3Path = path.resolve('C:/Users/fsayyed/.gemini/antigravity/brain/659ab4b7-0573-4914-b69a-94628454d01b/ui_verification/24_caseworker_dual_factor_modal.png');
    await page.screenshot({ path: screenshot3Path });
    console.log('Saved 24_caseworker_dual_factor_modal.png');
  }

  await browser.close();
  console.log('UI verification screenshots captured successfully.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
