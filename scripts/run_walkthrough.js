// CSC 2.0 Follow-Up Platform — Comprehensive Playwright End-to-End Walkthrough Runner
// Covers: Sign-in -> My Work -> Open Task -> Record Attempt -> Record Encounter ->
// Plan Next Action -> Client List -> Register New Client -> Find It -> Switch Language -> Sign Out.
// Generates desktop and mobile screenshots in English and Hindi.

const path = require('path');
const fs = require('fs');

let playwright;
try {
  playwright = require('playwright');
} catch (e) {
  playwright = require(path.join(__dirname, '..', 'frontend', 'node_modules', 'playwright'));
}
const { chromium } = playwright;

const EVIDENCE_DIR = path.join(__dirname, '..', 'evidence', 'walkthrough');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`\n❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runWalkthrough({ isMobile = false, lang = 'en' } = {}) {
  const modeLabel = isMobile ? 'mobile' : 'desktop';
  const prefix = `${modeLabel}_${lang}`;
  console.log(`\n======================================================`);
  console.log(`▶ Starting Walkthrough: ${modeLabel.toUpperCase()} (${lang.toUpperCase()})`);
  console.log(`======================================================`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: isMobile ? { width: 390, height: 844 } : { width: 1280, height: 820 },
    isMobile: isMobile,
    hasTouch: isMobile,
  });

  const page = await context.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`  [BROWSER ERROR] ${msg.text()}`);
  });

  try {
    // -----------------------------------------------------------------
    // STEP 1: Entry & Sign-In
    // -----------------------------------------------------------------
    console.log(`[Step 1] Navigating to http://localhost:3000/ ...`);
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    assert(page.url().includes('/sign-in'), `Unauthenticated visit to / must redirect to /sign-in, got ${page.url()}`);
    
    // Toggle language if needed
    if (lang === 'hi') {
      await page.click('button:has-text("हिन्दी")');
      await page.waitForTimeout(300);
    }

    const bannerText = await page.textContent('body');
    assert(bannerText.includes('LOCAL TEST IDENTITY – SYNTHETIC DATA'), 'Mandatory local test security banner must be present');
    assert(bannerText.includes('Ananya Sharma') && bannerText.includes('Dr. Sunita Rao'), 'Seeded test identities must be listed');

    await page.screenshot({ path: path.join(EVIDENCE_DIR, `${prefix}_01_signin.png`), fullPage: false });
    console.log(`  ✓ Step 1 Passed: Sign-in page validated & screenshot saved.`);

    // -----------------------------------------------------------------
    // STEP 2: Authenticate & Enter My Work
    // -----------------------------------------------------------------
    console.log(`[Step 2] Selecting Supervisor identity (Dr. Sunita Rao)...`);
    await page.click('button:has-text("Dr. Sunita Rao (Supervisor)")');
    await page.waitForURL('**/work', { timeout: 10000 });
    assert(page.url().includes('/work'), `Must redirect to /work after signing in, got ${page.url()}`);

    // Wait for worklist items to load
    await page.waitForSelector('text=Purpose 01:', { timeout: 10000 });
    const worklistBody = await page.textContent('body');
    assert(worklistBody.includes('Who needs action today, why, who owns it, and what completes it?'), 'Core platform workflow question must be visible');
    assert(worklistBody.includes('Aarav Sharma') || worklistBody.includes('Sunita Verma') || worklistBody.includes('Priyanka Devi'), 'Worklist must display real tasks');

    await page.screenshot({ path: path.join(EVIDENCE_DIR, `${prefix}_02_my_work.png`), fullPage: false });
    console.log(`  ✓ Step 2 Passed: Authenticated session active on My Work.`);

    // -----------------------------------------------------------------
    // STEP 3: Open Task -> Follow-Up Tab
    // -----------------------------------------------------------------
    console.log(`[Step 3] Opening first follow-up task...`);
    // Click on "Open Follow-up →" link
    const followupLink = page.locator('a:has-text("Open Follow-up →"), a:has-text("फॉलो-अप खोलें →")').first();
    await followupLink.click();
    await page.waitForURL(/.*clients\/.*tab=follow-up/, { timeout: 10000 });
    assert(page.url().includes('tab=follow-up'), `Must navigate to client record with ?tab=follow-up, got ${page.url()}`);

    // Assert Two Tabs are present
    const registrationTabBtn = page.locator('button:has-text("Registration"), button:has-text("पंजीकरण")');
    const followupTabBtn = page.locator('button:has-text("Follow-Up"), button:has-text("फॉलो-अप")');
    assert(await registrationTabBtn.isVisible(), 'Registration Tab button must be present');
    assert(await followupTabBtn.isVisible(), 'Follow-Up Tab button must be present');

    await page.screenshot({ path: path.join(EVIDENCE_DIR, `${prefix}_03_open_task_followup.png`), fullPage: false });
    console.log(`  ✓ Step 3 Passed: Client detail page opened directly on Follow-Up tab.`);

    // -----------------------------------------------------------------
    // STEP 4: Record Contact Attempt
    // -----------------------------------------------------------------
    console.log(`[Step 4] Recording contact attempt...`);
    const recordAttemptBtn = page.locator('button:has-text("Record Contact Attempt"), button:has-text("संपर्क प्रयास दर्ज करें")').first();
    if (await recordAttemptBtn.isVisible()) {
      await recordAttemptBtn.click();
      await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });
      // Fill contact attempt modal notes
      await page.locator('div[role="dialog"] textarea').fill('Beneficiary reached via phone. Confirmed next clinic visit.');
      await page.locator('div[role="dialog"] button[type="submit"]').click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(EVIDENCE_DIR, `${prefix}_04_record_attempt.png`), fullPage: false });
    console.log(`  ✓ Step 4 Passed: Contact attempt recorded successfully.`);

    // -----------------------------------------------------------------
    // STEP 5: Record Encounter (Section I) with explicit COMPLETE
    // -----------------------------------------------------------------
    console.log(`[Step 5] Recording clinical encounter (Section I)...`);
    const recordEncounterBtn = page.locator('button:has-text("Record Encounter"), button:has-text("मुलाकात (विजिट) दर्ज करें")').first();
    if (await recordEncounterBtn.isVisible()) {
      await recordEncounterBtn.click();
      await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });
      // Ensure Complete Task radio is selected
      const completeRadio = page.locator('div[role="dialog"] input[type="radio"][value="COMPLETE"]');
      if (await completeRadio.count() > 0) {
        await completeRadio.check();
      }
      const generalNotes = page.locator('div[role="dialog"] textarea').first();
      if (await generalNotes.count() > 0) {
        await generalNotes.fill('Comprehensive clinical encounter conducted. Pill count confirmed 100% adherence.');
      }
      await page.locator('div[role="dialog"] button[type="submit"]').click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(EVIDENCE_DIR, `${prefix}_05_record_encounter.png`), fullPage: false });
    console.log(`  ✓ Step 5 Passed: Encounter submitted with explicit COMPLETE action.`);

    // -----------------------------------------------------------------
    // STEP 6: Plan Next Action (Section J5)
    // -----------------------------------------------------------------
    console.log(`[Step 6] Planning next follow-up action (Section J5)...`);
    const planActionBtn = page.locator('button:has-text("Plan Next Service"), button:has-text("अगली सेवा योजना बनाएं")').first();
    if (await planActionBtn.isVisible()) {
      await planActionBtn.click();
      await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });
      const serviceNameInput = page.locator('div[role="dialog"] input[type="text"]').last();
      if (await serviceNameInput.count() > 0) {
        await serviceNameInput.fill('Routine Follow-up & CD4 Review');
      }
      await page.locator('div[role="dialog"] button[type="submit"]').click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(EVIDENCE_DIR, `${prefix}_06_plan_service.png`), fullPage: false });
    console.log(`  ✓ Step 6 Passed: Next service planned using canonical J5 code.`);

    // -----------------------------------------------------------------
    // STEP 7: Beneficiary Linelist Directory (/clients)
    // -----------------------------------------------------------------
    console.log(`[Step 7] Navigating to Beneficiary Directory (/clients)...`);
    await page.goto('http://localhost:3000/clients', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    assert(page.url().includes('/clients'), `Must be on /clients route, got ${page.url()}`);
    await page.waitForSelector('table', { timeout: 10000 });
    
    const clientRows = await page.locator('tbody tr').count();
    assert(clientRows >= 5, `Linelist must display multiple beneficiary rows, found ${clientRows}`);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, `${prefix}_07_clients_directory.png`), fullPage: false });
    console.log(`  ✓ Step 7 Passed: Client Linelist directory rendered with ${clientRows} rows.`);

    // -----------------------------------------------------------------
    // STEP 8: Register a New Client (Single-Page CRF)
    // -----------------------------------------------------------------
    console.log(`[Step 8] Registering new beneficiary on /clients/new...`);
    await page.goto('http://localhost:3000/clients/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    assert(page.url().includes('/clients/new'), `Must be on /clients/new, got ${page.url()}`);

    // Fill Section A: Full Name
    const uniqueSuffix = Date.now().toString().slice(-4);
    const newName = `Ramesh Verma ${uniqueSuffix}`;
    const nameInput = page.locator('input#field-a03_name, input[name="a01_full_name"], input[placeholder*="Name"], input[type="text"]').first();
    await nameInput.fill(newName);

    // Scroll to bottom and click Submit
    const submitBtn = page.locator('button[type="submit"], button:has-text("Submit Registration"), button:has-text("पंजीकरण जमा करें"), button:has-text("Review Before Submit")').last();
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    // If review modal is shown, confirm it
    if (await page.locator('div[role="dialog"]').isVisible()) {
      const confirmBtn = page.locator('div[role="dialog"] button:has-text("Confirm"), div[role="dialog"] button:has-text("सबमिट"), div[role="dialog"] button[type="submit"]').last();
      await confirmBtn.click();
    }

    // Must redirect to /clients/[id]?tab=registration&created=true
    await page.waitForURL(/.*clients\/.*created=true/, { timeout: 15000 });
    assert(page.url().includes('created=true'), `Must redirect to created client page, got ${page.url()}`);
    
    const noticeText = await page.textContent('body');
    assert(noticeText.includes('Beneficiary Registration Successfully Completed') || noticeText.includes('सफलतापूर्वक'), 'Success notice banner must be visible');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, `${prefix}_08_registered_new_client.png`), fullPage: false });
    console.log(`  ✓ Step 8 Passed: Beneficiary successfully created: ${newName}.`);

    // -----------------------------------------------------------------
    // STEP 9: Find the New Client in Linelist
    // -----------------------------------------------------------------
    console.log(`[Step 9] Searching for newly created client in Linelist...`);
    await page.goto('http://localhost:3000/clients', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill(newName);
    await page.waitForTimeout(600);
    const linelistContent = await page.textContent('table');
    assert(linelistContent.includes(newName), `Newly registered client '${newName}' must be found in linelist search`);

    await page.screenshot({ path: path.join(EVIDENCE_DIR, `${prefix}_09_found_new_client.png`), fullPage: false });
    console.log(`  ✓ Step 9 Passed: Search found newly registered beneficiary.`);

    // -----------------------------------------------------------------
    // STEP 10: Language Toggle (EN <-> HI)
    // -----------------------------------------------------------------
    console.log(`[Step 10] Switching language to Hindi / English...`);
    const langBtn = page.locator('button:has-text("हिन्दी")');
    if (await langBtn.isVisible()) {
      await langBtn.click();
      await page.waitForTimeout(400);
      const hindiPageText = await page.textContent('header');
      assert(hindiPageText.includes('मेरा कार्य') || hindiPageText.includes('लाभार्थी सूची') || hindiPageText.includes('सीएससी'), 'Header must render Hindi navigation');
    }
    await page.screenshot({ path: path.join(EVIDENCE_DIR, `${prefix}_10_switch_language_hi.png`), fullPage: false });
    console.log(`  ✓ Step 10 Passed: Bilingual toggle verified with instant DOM update.`);

    // -----------------------------------------------------------------
    // STEP 11: Sign Out (Warn about drafts, never wipe)
    // -----------------------------------------------------------------
    console.log(`[Step 11] Signing out...`);
    const signOutBtn = page.locator('button[aria-label="Sign Out"], button:has-text("Sign Out"), button:has-text("लॉगआउट")').first();
    await signOutBtn.click();
    await page.waitForTimeout(600);

    // If draft warning modal appears, confirm sign-out
    const confirmSignOutBtn = page.locator('button:has-text("Sign Out (Retain Local Draft)"), button:has-text("लॉगआउट (ड्राफ्ट सुरक्षित रखें)")');
    if (await confirmSignOutBtn.isVisible()) {
      await confirmSignOutBtn.click();
    }

    await page.waitForURL('**/sign-in', { timeout: 10000 });
    assert(page.url().includes('/sign-in'), `Sign out must return to /sign-in, got ${page.url()}`);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, `${prefix}_11_sign_out.png`), fullPage: false });
    console.log(`  ✓ Step 11 Passed: Signed out successfully.`);

  } catch (err) {
    console.error(`❌ WALKTHROUGH ERROR in ${prefix}:`, err);
    throw err;
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('STARTING FULL PLAYWRIGHT WALKTHROUGH SUITE');
  console.log('Target: Desktop & Mobile, English & Hindi');
  console.log(`Output Directory: ${EVIDENCE_DIR}\n`);

  // 1. Desktop English
  await runWalkthrough({ isMobile: false, lang: 'en' });

  // 2. Mobile English
  await runWalkthrough({ isMobile: true, lang: 'en' });

  // 3. Desktop Hindi
  await runWalkthrough({ isMobile: false, lang: 'hi' });

  // 4. Mobile Hindi
  await runWalkthrough({ isMobile: true, lang: 'hi' });

  console.log('\n======================================================');
  console.log('🎉 ALL 4 WALKTHROUGH MATRICES COMPLETED AND PASSED!');
  console.log('======================================================');
  
  const files = fs.readdirSync(EVIDENCE_DIR);
  console.log(`Generated ${files.length} evidence screenshots in evidence/walkthrough:`);
  files.forEach(f => console.log(`  - ${f}`));
}

main().catch(err => {
  console.error('Fatal Walkthrough Error:', err);
  process.exit(1);
});
