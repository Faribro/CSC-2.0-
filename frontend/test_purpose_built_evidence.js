const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('--- Starting Purpose-Built UX Hardening Verification ---');
  const browser = await chromium.launch({ headless: true });
  const evidenceDir = path.join(__dirname, 'test-evidence');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  // 1. MOBILE FIELD WORKER VIEW (EN & HI)
  console.log('1. Testing Mobile Field Worker (/work)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 13/14 size
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
  });
  const mobilePage = await mobileContext.newPage();

  // Set field user in localStorage
  await mobilePage.goto('http://localhost:3000/work');
  await mobilePage.evaluate(() => {
    localStorage.setItem('csc2_field_user', JSON.stringify({
      id: '00000000-0000-0000-0000-000000000001',
      firstName: 'Aarav',
      phone: '+919876543210',
      status: 'ACTIVE'
    }));
  });
  await mobilePage.reload();
  await mobilePage.waitForTimeout(1000);

  // Take screenshot of Mobile Forms Home (EN)
  await mobilePage.screenshot({ path: path.join(evidenceDir, '01_mobile_forms_home_en.png'), fullPage: true });
  console.log('   Saved 01_mobile_forms_home_en.png');

  // Switch to Hindi
  await mobilePage.click('button:has-text("HI")');
  await mobilePage.waitForTimeout(600);
  await mobilePage.screenshot({ path: path.join(evidenceDir, '02_mobile_forms_home_hi.png'), fullPage: true });
  console.log('   Saved 02_mobile_forms_home_hi.png');

  // Verify Daily Agenda triage bar is present
  const triageBar = await mobilePage.locator('text=Due Today, text=आज देय').count();
  console.log(`   Daily Triage Elements Count: ${triageBar}`);

  // 2. DESKTOP SUBMITTED RECORDS DIRECTORY (/clients)
  console.log('2. Testing Records Directory (/clients) for Stigma & Non-Clinical Safety...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto('http://localhost:3000/clients');
  await desktopPage.waitForTimeout(1000);

  // Take screenshot of Directory (EN)
  await desktopPage.screenshot({ path: path.join(evidenceDir, '03_desktop_clients_directory_en.png'), fullPage: true });
  console.log('   Saved 03_desktop_clients_directory_en.png');

  // Assert NO clinical details (HIV/ART status) or phone numbers in the directory table DOM
  const tableContent = await desktopPage.locator('table').textContent();
  const hasHivInTable = tableContent.includes('HIV / ART Status') || tableContent.includes('एचआईवी');
  const hasPhonePattern = /\+91\d{10}/.test(tableContent);
  console.log(`   ASSERT: Table contains HIV column: ${hasHivInTable} (Expected: false)`);
  console.log(`   ASSERT: Table exposes phone numbers: ${hasPhonePattern} (Expected: false)`);
  if (hasHivInTable || hasPhonePattern) {
    throw new Error('Confidentiality violation: Clinical data or phone numbers leaked in directory list!');
  }

  // Switch to Hindi
  await desktopPage.click('button:has-text("HI")');
  await desktopPage.waitForTimeout(600);
  await desktopPage.screenshot({ path: path.join(evidenceDir, '04_desktop_clients_directory_hi.png'), fullPage: true });
  console.log('   Saved 04_desktop_clients_directory_hi.png');

  // 3. EVALUATION TAB - LOCKED / AUTH REQUIRED VIEW
  console.log('3. Testing Evaluation Tab Unauthenticated Locked View...');
  await desktopPage.evaluate(() => {
    localStorage.removeItem('csc2_eval_user');
    localStorage.removeItem('csc2_auth_token');
  });
  await desktopPage.goto('http://localhost:3000/admin');
  await desktopPage.waitForTimeout(800);
  await desktopPage.screenshot({ path: path.join(evidenceDir, '05_desktop_eval_locked_en.png') });
  console.log('   Saved 05_desktop_eval_locked_en.png');

  // 4. EVALUATION TAB - STATE TEAM WORK QUEUE
  console.log('4. Testing Evaluation Tab - State Team Operations Work Queue...');
  await desktopPage.evaluate(() => {
    localStorage.setItem('csc2_eval_user', JSON.stringify({
      role: 'state',
      fullName: 'Vikram Shinde',
      state: 'MH'
    }));
    localStorage.setItem('csc2_auth_token', 'mock_state_token');
  });
  await desktopPage.reload();
  await desktopPage.waitForTimeout(1000);

  // Capture State Team Work Queue (EN)
  await desktopPage.screenshot({ path: path.join(evidenceDir, '06_desktop_eval_state_workqueue_en.png'), fullPage: true });
  console.log('   Saved 06_desktop_eval_state_workqueue_en.png');

  // Test Mobile State Team Work Queue
  await mobilePage.evaluate(() => {
    localStorage.setItem('csc2_eval_user', JSON.stringify({
      role: 'state',
      fullName: 'Vikram Shinde',
      state: 'MH'
    }));
    localStorage.setItem('csc2_auth_token', 'mock_state_token');
  });
  await mobilePage.goto('http://localhost:3000/admin');
  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({ path: path.join(evidenceDir, '07_mobile_eval_state_workqueue.png'), fullPage: true });
  console.log('   Saved 07_mobile_eval_state_workqueue.png');

  // Switch to Programme Rules Registry Tab on Desktop
  console.log('5. Testing Programme Rules Registry Tab...');
  await desktopPage.click('button:has-text("Programme Rules Registry")');
  await desktopPage.waitForTimeout(600);
  await desktopPage.screenshot({ path: path.join(evidenceDir, '08_desktop_eval_rules_registry.png'), fullPage: true });
  console.log('   Saved 08_desktop_eval_rules_registry.png');

  // 6. EVALUATION TAB - NATIONAL LEADERSHIP DASHBOARD (ZERO CLIENT PII)
  console.log('6. Testing Evaluation Tab - National Leadership Dashboard...');
  await desktopPage.evaluate(() => {
    localStorage.setItem('csc2_eval_user', JSON.stringify({
      role: 'leadership',
      fullName: 'Dr. Meenakshi Sundaram',
      state: 'NATIONAL'
    }));
    localStorage.setItem('csc2_auth_token', 'mock_leader_token');
  });
  await desktopPage.reload();
  await desktopPage.waitForTimeout(1000);

  // Capture Leadership Overview (EN)
  await desktopPage.screenshot({ path: path.join(evidenceDir, '09_desktop_eval_leadership_overview_en.png'), fullPage: true });
  console.log('   Saved 09_desktop_eval_leadership_overview_en.png');

  // Verify explicit denominators in Leadership view
  const leadershipText = await desktopPage.textContent('body');
  const hasDenominators = leadershipText.includes('478 / 540') && leadershipText.includes('438 / 465');
  console.log(`   ASSERT: Explicit Denominators Present: ${hasDenominators} (Expected: true)`);

  // Switch to Leadership District Performance Tab
  await desktopPage.click('button:has-text("District Performance Rankings")');
  await desktopPage.waitForTimeout(600);

  // Click drill-down expander for Pune
  await desktopPage.click('button:has-text("View Linkages")');
  await desktopPage.waitForTimeout(500);
  await desktopPage.screenshot({ path: path.join(evidenceDir, '10_desktop_eval_leadership_districts.png'), fullPage: true });
  console.log('   Saved 10_desktop_eval_leadership_districts.png');

  // Capture Mobile Leadership View
  await mobilePage.evaluate(() => {
    localStorage.setItem('csc2_eval_user', JSON.stringify({
      role: 'leadership',
      fullName: 'Dr. Meenakshi Sundaram',
      state: 'NATIONAL'
    }));
    localStorage.setItem('csc2_auth_token', 'mock_leader_token');
  });
  await mobilePage.reload();
  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({ path: path.join(evidenceDir, '11_mobile_eval_leadership.png'), fullPage: true });
  console.log('   Saved 11_mobile_eval_leadership.png');

  await browser.close();
  console.log('--- Purpose-Built UX Hardening Verification Complete! ---');
}

run().catch((err) => {
  console.error('Test Execution Failed:', err);
  process.exit(1);
});
