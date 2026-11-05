const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('--- Verifying My Follow-ups in Records & Follow-ups Tab ---');
  const browser = await chromium.launch({ headless: true });
  const evidenceDir = path.join(__dirname, 'test-evidence');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await desktopContext.newPage();

  // Set field user in localStorage
  await page.goto('http://localhost:3000/work');
  await page.evaluate(() => {
    localStorage.setItem('csc2_field_user', JSON.stringify({
      id: '00000000-0000-0000-0000-000000000001',
      firstName: 'Aarav',
      phone: '+919876543210',
      status: 'ACTIVE'
    }));
  });

  // 1. Check Forms Home (/work)
  console.log('1. Checking Forms Home (/work)...');
  await page.reload();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(evidenceDir, '20_work_page_triage_clean.png'), fullPage: true });
  console.log('   Saved 20_work_page_triage_clean.png');

  // Click on "Due Today" pill on Forms Home -> should navigate to /clients?view=today
  await page.click('button:has-text("Due Today")');
  await page.waitForTimeout(1000);
  console.log(`   Navigated to URL: ${page.url()}`);

  // 2. Check /clients (Records & Follow-ups Tab) with TODAY active
  console.log('2. Checking Records & Follow-ups (/clients) with TODAY active...');
  await page.screenshot({ path: path.join(evidenceDir, '21_clients_today_followups_en.png'), fullPage: true });
  console.log('   Saved 21_clients_today_followups_en.png');

  // Verify searchbar and pills exist in the same toolbar
  const searchInput = await page.locator('input[placeholder*="Search"]').isVisible();
  const todayPill = await page.locator('button:has-text("Today")').isVisible();
  const overduePill = await page.locator('button:has-text("Overdue")').isVisible();
  const upcomingPill = await page.locator('button:has-text("Upcoming")').isVisible();
  const allRecordsPill = await page.locator('button:has-text("All Records")').isVisible();

  console.log(`   ASSERT: Search Input visible: ${searchInput}`);
  console.log(`   ASSERT: Today Pill visible: ${todayPill}`);
  console.log(`   ASSERT: Overdue Pill visible: ${overduePill}`);
  console.log(`   ASSERT: Upcoming Pill visible: ${upcomingPill}`);
  console.log(`   ASSERT: All Records Pill visible: ${allRecordsPill}`);

  if (!searchInput || !todayPill || !overduePill || !upcomingPill || !allRecordsPill) {
    throw new Error('Follow-up segment pills or searchbar missing in Records tab!');
  }

  // 3. Click Overdue Pill
  console.log('3. Clicking Overdue Pill...');
  await page.click('button:has-text("Overdue")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(evidenceDir, '22_clients_overdue_followups_en.png'), fullPage: true });
  console.log('   Saved 22_clients_overdue_followups_en.png');

  // 4. Click Upcoming Pill
  console.log('4. Clicking Upcoming Pill...');
  await page.click('button:has-text("Upcoming")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(evidenceDir, '23_clients_upcoming_followups_en.png'), fullPage: true });
  console.log('   Saved 23_clients_upcoming_followups_en.png');

  // 5. Click All Records Pill
  console.log('5. Clicking All Records Pill...');
  await page.click('button:has-text("All Records")');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(evidenceDir, '24_clients_all_records_linelist_en.png'), fullPage: true });
  console.log('   Saved 24_clients_all_records_linelist_en.png');

  // Verify status sub-filters appear when All Records is active
  const statusFilterSynced = await page.locator('button:has-text("Synced")').isVisible();
  console.log(`   ASSERT: Status sub-filters visible in All Records view: ${statusFilterSynced}`);

  // 6. Switch to Hindi
  console.log('6. Testing Hindi in Records & Follow-ups...');
  await page.click('button:has-text("HI")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(evidenceDir, '25_clients_all_records_hi.png'), fullPage: true });
  console.log('   Saved 25_clients_all_records_hi.png');

  // Switch back to Today in Hindi
  await page.click('button:has-text("आज देय")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(evidenceDir, '26_clients_today_followups_hi.png'), fullPage: true });
  console.log('   Saved 26_clients_today_followups_hi.png');

  // 7. Test Mobile Viewport
  console.log('7. Testing Mobile Viewport (iPhone 390x844)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:3000/clients');
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
  await mobilePage.screenshot({ path: path.join(evidenceDir, '27_mobile_clients_followups.png'), fullPage: true });
  console.log('   Saved 27_mobile_clients_followups.png');

  await browser.close();
  console.log('--- Verification Complete! All screenshots captured! ---');
}

run().catch((err) => {
  console.error('Test Execution Failed:', err);
  process.exit(1);
});
