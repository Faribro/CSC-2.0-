// scripts/capture_phase2_evidence.js
// Automated Playwright script capturing synthetic UI evidence for Phase 2

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const EVIDENCE_DIR = path.join(__dirname, '..', 'evidence');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function run() {
  console.log('Starting Playwright browser for Phase 2 UI evidence capture...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    // 1. Registration Full Page
    console.log('[1/5] Capturing evidence/registration_full_page.png...');
    await page.goto('http://localhost:3000/clients/new', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'registration_full_page.png'),
      fullPage: false,
    });

    // 2. Section Index Sticky Runner
    console.log('[2/5] Capturing evidence/section_index_sticky.png...');
    // Scroll down to Section C (Testing & Treatment)
    await page.evaluate(() => {
      window.scrollTo(0, 1100);
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'section_index_sticky.png'),
      fullPage: false,
    });

    // 3. Family Repeat Row (Section B)
    console.log('[3/5] Capturing evidence/family_repeat_row.png...');
    // Scroll back up to Section B
    await page.evaluate(() => {
      window.scrollTo(0, 500);
    });
    await page.waitForTimeout(500);
    // Click "+ Add Family Member" button
    const addMemberBtn = await page.$('button:has-text("Add Family Member"), button:has-text("परिवार सदस्य जोड़ें")');
    if (addMemberBtn) {
      await addMemberBtn.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'family_repeat_row.png'),
      fullPage: false,
    });

    // 4. Follow-up Tab on Client Record Page
    console.log('[4/5] Capturing evidence/followup_tab.png...');
    await page.goto('http://localhost:3000/clients/client-001', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'followup_tab.png'),
      fullPage: false,
    });

    // 5. Chronological Timeline
    console.log('[5/5] Capturing evidence/timeline_chronological.png...');
    // Scroll down to the Chronological Timeline section
    await page.evaluate(() => {
      window.scrollTo(0, 550);
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'timeline_chronological.png'),
      fullPage: false,
    });

    console.log('✓ All 5 synthetic UI evidence screenshots captured successfully.');
  } catch (err) {
    console.error('Error during evidence capture:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
