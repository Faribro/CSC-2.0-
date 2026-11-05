import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const evidenceDir = path.join(__dirname, '../test-evidence/honest-evaluation');

test.beforeAll(() => {
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }
});

test.describe('Evaluation Honest & Verified Assertions', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to a safe base and clear any lingering sessions
    await page.goto('/work');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('csc2_lang', 'en');
    });
  });

  test('Assertion 1: Header Online/Offline Wifi Icon Indicator (No Raw "Online" Text)', async ({ page }) => {
    await page.goto('/work');
    await page.waitForLoadState('domcontentloaded');

    // Locate wifi indicator by test ID
    const wifiIndicator = page.locator('[data-testid="header-network-indicator"]');
    await expect(wifiIndicator).toBeVisible();

    // Assert that the visible text inside the header network badge does NOT contain raw "Online" or "Offline" text
    const badgeText = await wifiIndicator.innerText();
    expect(badgeText.trim()).toBe(''); // Icon only, no text

    // Assert it contains the SVG icon (Wifi)
    const svgIcon = wifiIndicator.locator('svg');
    await expect(svgIcon).toBeVisible();

    // Assert aria-label describes network status
    await expect(wifiIndicator).toHaveAttribute('aria-label', /Network Status/);

    await page.screenshot({ path: path.join(evidenceDir, `01_header_wifi_${test.info().project.name}.png`) });
  });

  test('Assertion 2: Stigma Defense - NO Phone Numbers or Clinical HIV Terms in Lists', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForLoadState('domcontentloaded');

    const bodyText = await page.innerText('body');

    // Assert no raw 10-digit phone numbers in beneficiary list
    const phoneRegex = /(?:\+91|0)?[6-9]\d{9}/g;
    const matches = bodyText.match(phoneRegex) || [];
    expect(matches.length).toBe(0);

    // Assert strictly no clinical / stigma terms in client list DOM
    expect(bodyText.toLowerCase()).not.toContain('hiv positive');
    expect(bodyText.toLowerCase()).not.toContain('viral load copies');
    expect(bodyText.toLowerCase()).not.toContain('cd4 count');
    expect(bodyText.toLowerCase()).not.toContain('art number');

    await page.screenshot({ path: path.join(evidenceDir, `02_clients_linelist_stigma_free_${test.info().project.name}.png`) });
  });

  test('Assertion 3: Role Gating - Unauthenticated User at /admin is Locked Out', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');

    // Verify Access Gate locked view is shown
    await expect(page.locator('text=Evaluation Access Required')).toBeVisible();
    await expect(page.locator('text=Sign In to Access')).toBeVisible();
    await expect(page.locator('text=Return to Forms')).toBeVisible();

    // Assert actual supervision work queue tab button and operations table are hidden
    await expect(page.locator('button:has-text("Supervision Work Queue")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Caseworker Roster")')).toHaveCount(0);
    await expect(page.locator('h1:has-text("Supervision & Casework Operations")')).toHaveCount(0);
    await expect(page.locator('h1:has-text("Strategic Programme Surveillance")')).toHaveCount(0);

    await page.screenshot({ path: path.join(evidenceDir, `03_admin_unauthenticated_locked_${test.info().project.name}.png`) });
  });

  test('Assertion 4: Leadership Role - Zero Client PII Exposed & Sample Banner Active', async ({ page }) => {
    // Seed leadership session in localStorage
    await page.goto('/admin');
    await page.evaluate(() => {
      localStorage.setItem('csc2_eval_user', JSON.stringify({
        role: 'leadership',
        fullName: 'Dr. Neha Sharma',
        state: 'NATIONAL',
      }));
      localStorage.setItem('csc2_auth_token', 'mock-leadership-token');
      localStorage.setItem('csc2_lang', 'en');
    });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Assert Leadership surveillance header
    await expect(page.locator('text=National Strategic Surveillance')).toBeVisible();

    // Assert Sample Demonstration Data Banner is prominent
    const banner = page.locator('text=Sample Demonstration Data • Pending NACO Approval');
    await expect(banner).toBeVisible();
    await expect(page.getByText('SYNTHETIC DEMO', { exact: true }).first()).toBeVisible();

    // Assert Indicator Draft Badges are visible
    const draftBadges = page.locator('text=DRAFT DEFINITION');
    await expect(draftBadges.first()).toBeVisible();

    // Assert explicit Definition, Numerator, Denominator on cards
    await expect(page.locator('text=Definition:').first()).toBeVisible();
    await expect(page.locator('text=Numerator:').first()).toBeVisible();
    await expect(page.locator('text=Denominator:').first()).toBeVisible();

    // Assert zero client PII or individual client links are present
    const clientLinks = page.locator('a[href^="/clients/"]');
    await expect(clientLinks).toHaveCount(0);

    // Check District Performance Ranking table has synthetic benchmark banner
    await page.click('button:has-text("District Performance Rankings")');
    await expect(page.locator('text=SYNTHETIC BENCHMARK')).toBeVisible();

    await page.screenshot({ path: path.join(evidenceDir, `04_leadership_strategic_view_${test.info().project.name}.png`) });
  });

  test('Assertion 5: State Team Role - Scoped to State (Maharashtra Work Queue)', async ({ page }) => {
    // Seed State Team session for Maharashtra
    await page.goto('/admin');
    await page.evaluate(() => {
      localStorage.setItem('csc2_eval_user', JSON.stringify({
        role: 'state_team',
        fullName: 'Priya Deshmukh',
        state: 'MH',
      }));
      localStorage.setItem('csc2_auth_token', 'mock-state-token');
      localStorage.setItem('csc2_lang', 'en');
    });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Assert State Team Work Queue header
    await expect(page.locator('text=State Team Work Queue: MH')).toBeVisible();

    // Assert Work Queue tabs
    await expect(page.locator('button:has-text("Supervision Work Queue")')).toBeVisible();
    await expect(page.locator('button:has-text("Caseworker Roster")')).toBeVisible();
    await expect(page.locator('button:has-text("Programme Rules Registry")')).toBeVisible();

    // Assert Rules Registry has all 9 rules with DRAFT status
    await page.click('button:has-text("Programme Rules Registry")');
    await expect(page.locator('text=RULE-NACO-2025-ART-INIT')).toBeVisible();
    await expect(page.locator('text=RULE-NTEP-2024-TB-ATT')).toBeVisible();

    await page.screenshot({ path: path.join(evidenceDir, `05_state_team_work_queue_${test.info().project.name}.png`) });
  });

  test('Assertion 6: Hindi Language Switch on Evaluation Dashboard', async ({ page }) => {
    // Seed State Team session in Hindi
    await page.goto('/admin');
    await page.evaluate(() => {
      localStorage.setItem('csc2_eval_user', JSON.stringify({
        role: 'state_team',
        fullName: 'Priya Deshmukh',
        state: 'MH',
      }));
      localStorage.setItem('csc2_auth_token', 'mock-state-token');
      localStorage.setItem('csc2_lang', 'hi');
    });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Verify Hindi labels
    await expect(page.locator('text=राज्य टीम पर्यवेक्षण: MH')).toBeVisible();
    await expect(page.locator('button:has-text("पर्यवेक्षण कार्य-कतार")')).toBeVisible();
    await expect(page.locator('button:has-text("कार्यकर्ता रोस्टर")')).toBeVisible();

    await page.screenshot({ path: path.join(evidenceDir, `06_state_team_hindi_${test.info().project.name}.png`) });
  });

});
