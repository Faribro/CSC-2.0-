const { chromium } = require('@playwright/test');

(async () => {
  console.log('Testing Section A (A16, A17, A20, A21) and Section B (B2a-B2l, B5)...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.addInitScript(() => {
    localStorage.setItem('csc_token', 'mock-token-for-test');
    localStorage.setItem('csc_user', JSON.stringify({
      id: 'usr-1',
      name: 'Ramesh Field Officer',
      role: 'FIELD_WORKER',
      centerId: 'csc-delhi-1'
    }));
  });

  await page.goto('http://localhost:3000/clients/new', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Check A16
  const a16Btns = page.locator('#wrapper-a16_caretaker button');
  const a16Count = await a16Btns.count();
  console.log(`A16 buttons count: ${a16Count}`);
  if (a16Count > 0) {
    console.log(`A16 options: ${(await a16Btns.allTextContents()).join(', ')}`);
  }

  // Check A17
  const a17Btns = page.locator('#wrapper-a17_orphan button');
  const a17Count = await a17Btns.count();
  console.log(`A17 buttons count: ${a17Count}`);
  if (a17Count > 0) {
    console.log(`A17 options: ${(await a17Btns.allTextContents()).join(', ')}`);
  }

  // Check A20 Marital status
  const a20Select = page.locator('select#field-a20_marital');
  const a20Count = await a20Select.count();
  console.log(`A20 select count: ${a20Count}`);
  if (a20Count > 0) {
    const opts = (await a20Select.locator('option').allTextContents()).filter(o => o.trim() && !o.includes('--'));
    console.log(`A20 options (${opts.length}): ${opts.join(' | ')}`);
  }

  // Check A21 Income
  const a21Select = page.locator('select#field-a21_income');
  const a21Count = await a21Select.count();
  console.log(`A21 select count: ${a21Count}`);
  if (a21Count > 0) {
    const opts = (await a21Select.locator('option').allTextContents()).filter(o => o.trim() && !o.includes('--'));
    console.log(`A21 options (${opts.length}): ${opts.join(' | ')}`);
  }

  // Check Section B: B5 Coding guide
  const b5Guide = page.locator('text=B5.').first();
  console.log(`B5 guide present: ${await b5Guide.count() > 0}`);

  // Check Section B: B2h to B2l
  console.log('Checking B2a to B2l fields in member row #1:');
  const b2Labels = [
    'B2a. Relationship',
    'B2b. Full Name',
    'B2c. Age',
    'B2d. Gender',
    'B2e. Living Status',
    'B2f. Date of HIV Test',
    'B2g. HIV Status',
    'B2h. Latest CD4',
    'B2i. Latest Viral Load',
    'B2j. ART Status',
    'B2k. Type of ID',
    'B2k. ID Number',
    'B2l. Registered at CSC',
    'B2l. Client CSC ID'
  ];

  for (const lbl of b2Labels) {
    const el = page.locator(`label:has-text("${lbl}")`).first();
    const exists = await el.count() > 0;
    console.log(`  ${lbl}: ${exists ? '✓ FOUND' : '❌ NOT FOUND'}`);
  }

  // Capture screenshot of Section A and B
  await page.screenshot({ path: 'frontend/test-evidence/evidence_a16_a17_a20_a21_b2_b5.png', fullPage: true });
  console.log('Saved screenshot to frontend/test-evidence/evidence_a16_a17_a20_a21_b2_b5.png');

  await browser.close();
})();
