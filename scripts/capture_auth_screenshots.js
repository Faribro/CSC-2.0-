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

  console.log('Navigating to http://localhost:3000/clients/new ...');
  await page.goto('http://localhost:3000/clients/new', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Open Evaluation Login Modal via mobile bottom navigation
  const evalTab = page.locator('nav[aria-label="Mobile Navigation"] a:has-text("Evaluation")');
  console.log('Mobile eval tab count:', await evalTab.count());
  if (await evalTab.count() > 0) {
    await evalTab.first().click();
    await page.waitForTimeout(600);

    // Click 'Work Email Sign Up' tab
    const signUpTab = page.locator('button:has-text("Work Email Sign Up")');
    if (await signUpTab.count() > 0) {
      await signUpTab.first().click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: path.join(artifactDir, '23_state_team_signup_2step_modal.png') });
    console.log('Saved 23_state_team_signup_2step_modal.png');

    // Switch to Leadership tab
    const leaderTab = page.locator('button:has-text("National Leadership")');
    if (await leaderTab.count() > 0) {
      await leaderTab.first().click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(artifactDir, '25_leadership_otp_modal.png') });
      console.log('Saved 25_leadership_otp_modal.png');
    }

    // Close modal
    const closeBtn = page.locator('button[aria-label="Close modal"]');
    if (await closeBtn.count() > 0) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // Open Field Phone Verification Modal
  console.log('Opening Caseworker Verification Modal via custom event...');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('csc2:open_phone_verification')));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, '24_caseworker_dual_factor_modal.png') });
  console.log('Saved 24_caseworker_dual_factor_modal.png');

  await browser.close();
  console.log('Screenshots complete.');
})();
