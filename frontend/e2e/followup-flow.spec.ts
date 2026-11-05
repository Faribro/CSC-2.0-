import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Fast and Friendly Follow-Up Engine E2E and Timing Baseline', () => {
  const screenshotsDir = path.join(__dirname, '../test-evidence/screenshots');

  test.beforeAll(async () => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test('E2E Flow 1: Records Tab -> My Follow-ups -> Record Minimal Visit & Complete', async ({ page }) => {
    // 1. Visit /clients (where My Follow-ups now resides per prompt)
    await page.goto('/clients');
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: path.join(screenshotsDir, '01_forms_tab_followups.png') });

    // Verify "Beneficiary Records & Linelist" header and follow-up view pills are present
    const header = page.locator('text=Beneficiary Records & Linelist');
    await expect(header).toBeVisible();

    // Check segments: Today, Overdue, Upcoming
    await expect(page.locator('button:has-text("Today")')).toBeVisible();
    await expect(page.locator('button:has-text("Overdue")')).toBeVisible();
    await expect(page.locator('button:has-text("Upcoming")')).toBeVisible();

    // Record visit on first available client
    const recordVisitBtn = page.locator('button:has-text("Record visit")').first();
    if (await recordVisitBtn.isVisible()) {
      await recordVisitBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(screenshotsDir, '02_client_page_from_card.png') });
    }
  });

  test('E2E Flow 2: Client Page -> Sticky Bottom Bar -> Could Not Reach Attempt', async ({ page }) => {
    // Visit client detail page with followup tab
    await page.goto('/clients?search=');
    await page.waitForLoadState('domcontentloaded');
    
    const clientLink = page.locator('table tbody tr a').first();
    if (await clientLink.isVisible()) {
      await clientLink.click();
      await page.waitForLoadState('domcontentloaded');

      // Click Follow-up tab
      await page.click('button:has-text("Follow-up & Visits")');
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(screenshotsDir, '03_client_followup_tab.png') });

      // Click "Could not reach" button in action bar
      const couldNotReachBtn = page.locator('button:has-text("Could not reach")').first();
      await expect(couldNotReachBtn).toBeVisible();
      
      const startTime = Date.now();
      await couldNotReachBtn.click();
      await page.waitForSelector('text=Could Not Reach Client');
      await page.screenshot({ path: path.join(screenshotsDir, '04_modal_could_not_reach.png') });

      // Select reason: No answer
      await page.click('button:has-text("No answer / Rang out")');
      // Click Save Contact Attempt
      await page.click('button:has-text("Save Contact Attempt")');
      await page.waitForTimeout(600);
      const elapsedSec = (Date.now() - startTime) / 1000;
      console.log(`[Timing Study Baseline] (a) Could Not Reach: 3 taps, ${elapsedSec.toFixed(1)}s (Target: <60s)`);

      await page.screenshot({ path: path.join(screenshotsDir, '05_could_not_reach_recorded.png') });
    }
  });

  test('E2E Flow 3: Reschedule Flow with Date Shortcuts and History', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForLoadState('domcontentloaded');

    const clientLink = page.locator('table tbody tr a').first();
    if (await clientLink.isVisible()) {
      await clientLink.click();
      await page.waitForLoadState('domcontentloaded');

      await page.click('button:has-text("Follow-up & Visits")');
      await page.waitForTimeout(400);

      const reschedBtn = page.locator('button:has-text("Reschedule")').first();
      await expect(reschedBtn).toBeVisible();
      await reschedBtn.click();

      await page.waitForSelector('text=Reschedule Follow-up');
      await page.screenshot({ path: path.join(screenshotsDir, '06_modal_reschedule.png') });

      // Click Date Shortcut "+2 Weeks"
      await page.click('button:has-text("+2 Weeks")');
      // Fill mandatory reason
      await page.fill('textarea[placeholder*="Client traveled"]', 'Client attending family wedding in hometown');
      // Save
      await page.click('button:has-text("Save Rescheduled Date")');
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(screenshotsDir, '07_rescheduled_saved.png') });
    }
  });

  test('E2E Flow 4: Record Visit with Measurements (Section I Parity) & Next Action', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForLoadState('domcontentloaded');

    const clientLink = page.locator('table tbody tr a').first();
    if (await clientLink.isVisible()) {
      await clientLink.click();
      await page.waitForLoadState('domcontentloaded');

      await page.click('button:has-text("Follow-up & Visits")');
      await page.waitForTimeout(400);

      const recordVisitBtn = page.locator('button:has-text("Record visit")').first();
      await recordVisitBtn.click();

      await page.waitForSelector('text=Visited / Spoke');
      await page.screenshot({ path: path.join(screenshotsDir, '08_modal_visited_choice.png') });

      // Step 1: Click Visited/Spoke
      await page.click('button:has-text("Visited / Spoke")');
      await page.waitForSelector('text=Visit Details & Clinical Progress');

      // Expand Anthropometry accordion
      await page.click('button:has-text("Anthropometry & Vitals")');
      await page.screenshot({ path: path.join(screenshotsDir, '09_modal_anthropometry_expanded.png') });

      // Fill measurements: Weight 62 kg
      await page.fill('input[placeholder="e.g. 58"]', '62');

      // Expand ART & Clinical Status
      await page.click('button:has-text("ART Status, Regimen & Lab Tests")');
      await page.screenshot({ path: path.join(screenshotsDir, '10_modal_clinical_expanded.png') });

      // Fill CD4 count: 520
      await page.fill('input[placeholder="e.g. 450"]', '520');

      // Continue to Next Action
      await page.click('button:has-text("Continue to Next Action →")');
      await page.waitForSelector('text=Schedule Next Follow-up');
      await page.screenshot({ path: path.join(screenshotsDir, '11_modal_next_action.png') });

      // Select shortcut: in 1 month
      await page.click('button:has-text("in 1 month")');
      // Toggle "Mark this follow-up task complete"
      await page.click('text=Mark this follow-up task complete');

      // Click "Save & Done"
      await page.click('button:has-text("Save & Done")');
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(screenshotsDir, '12_visit_saved_success.png') });
    }
  });

  test('E2E Flow 5: Bilingual Hindi Toggle Verification', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForLoadState('domcontentloaded');

    // Switch to Hindi
    const hiBtn = page.locator('button:has-text("HI")');
    if (await hiBtn.isVisible()) {
      await hiBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(screenshotsDir, '13_hindi_workspace.png') });

      // Verify Hindi section header or tabs
      await expect(page.locator('button:has-text("आज")').or(page.locator('text=मेरे फॉलो-अप'))).toBeVisible();
    }
  });
});
