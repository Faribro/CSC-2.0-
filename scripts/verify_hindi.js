const { chromium } = require('@playwright/test');

(async () => {
  console.log('Testing Hindi localization for A16, A17, A20, A21 and B2a-B2l, B5...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.addInitScript(() => {
    localStorage.setItem('csc_token', 'mock-token-for-test');
    localStorage.setItem('csc_lang', 'hi');
    localStorage.setItem('csc_user', JSON.stringify({
      id: 'usr-1',
      name: 'Ramesh Field Officer',
      role: 'FIELD_WORKER',
      centerId: 'csc-delhi-1'
    }));
  });

  await page.goto('http://localhost:3000/clients/new?lang=hi', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Switch to Hindi explicitly if toggle exists
  const hiBtn = page.locator('button:has-text("HI")').first();
  if (await hiBtn.count() > 0) {
    await hiBtn.click();
    await page.waitForTimeout(500);
  }

  // Check A16 Hindi
  const a16 = page.locator('#wrapper-a16_caretaker button');
  console.log(`A16 Hindi options: ${(await a16.allTextContents()).join(', ')}`);

  // Check A17 Hindi
  const a17 = page.locator('#wrapper-a17_orphan button');
  console.log(`A17 Hindi options: ${(await a17.allTextContents()).join(', ')}`);

  // Check A20 Hindi
  const a20 = page.locator('select#field-a20_marital');
  const a20Opts = (await a20.locator('option').allTextContents()).filter(o => o.trim() && !o.includes('--'));
  console.log(`A20 Hindi options: ${a20Opts.join(' | ')}`);

  // Check A21 Hindi
  const a21 = page.locator('select#field-a21_income');
  const a21Opts = (await a21.locator('option').allTextContents()).filter(o => o.trim() && !o.includes('--'));
  console.log(`A21 Hindi options: ${a21Opts.join(' | ')}`);

  // Check B5 Hindi
  const b5 = page.locator('text=B5. तालिका में जानकारी').first();
  console.log(`B5 Hindi guide present: ${await b5.count() > 0}`);

  // Check B2 Hindi labels
  const b2hLabel = page.locator('label:has-text("B2h. नवीनतम CD4")').first();
  const b2iLabel = page.locator('label:has-text("B2i. नवीनतम VL")').first();
  const b2jLabel = page.locator('label:has-text("B2j. एआरटी स्थिति")').first();
  const b2kLabel = page.locator('label:has-text("B2k. आईडी प्रकार")').first();
  const b2lLabel = page.locator('label:has-text("B2l. CSC में पंजीकृत?")').first();

  console.log(`B2h Hindi: ${await b2hLabel.count() > 0}`);
  console.log(`B2i Hindi: ${await b2iLabel.count() > 0}`);
  console.log(`B2j Hindi: ${await b2jLabel.count() > 0}`);
  console.log(`B2k Hindi: ${await b2kLabel.count() > 0}`);
  console.log(`B2l Hindi: ${await b2lLabel.count() > 0}`);

  await page.screenshot({ path: 'frontend/test-evidence/evidence_hindi_a_and_b.png', fullPage: true });
  console.log('Saved screenshot to frontend/test-evidence/evidence_hindi_a_and_b.png');

  await browser.close();
})();
