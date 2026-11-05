const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addInitScript(() => {
    localStorage.setItem('csc_token', 'mock-token-for-test');
    localStorage.setItem('csc_user', JSON.stringify({
      id: 'usr-1',
      name: 'Ramesh Field Officer',
      role: 'FIELD_WORKER',
      centerId: 'csc-delhi-1'
    }));
    localStorage.setItem('csc2_field_user', JSON.stringify({
      id: 'usr-1',
      firstName: 'रमेश',
      phone: '+919876543210',
      status: 'VERIFIED',
      centerId: 'DL-CENTRAL-01'
    }));
  });
  const page = await context.newPage();

  console.log('Testing Follow-Up Modal in Hindi (HI)...');
  await page.goto('http://localhost:3000/clients/client-001', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Switch to HI BEFORE modal is opened
  await page.click('button:has-text("HI")');
  await page.waitForTimeout(500);

  // Open modal via button
  await page.click('button:has-text("विज़िट दर्ज करें")');
  await page.waitForTimeout(1000);

  // Open SWS accordion
  const swsAccordion = page.locator('button:has-text("सामाजिक कल्याण योजना लिंकेज")');
  if (await swsAccordion.isVisible()) {
    await swsAccordion.click();
    await page.waitForTimeout(300);
    const swsLabels = await page.locator('div:has-text("सामाजिक कल्याण योजना लिंकेज") div.max-h-60 label').allTextContents();
    console.log(`Hindi SWS options count: ${swsLabels.length}`);
    console.log('  Items [0..1]:', swsLabels.slice(0, 2).map(s => s.trim()).join(' | '));
  }

  // Open Stigma accordion
  const stigmaAccordion = page.locator('button:has-text("भेदभाव / कलंक का सामना")');
  if (await stigmaAccordion.isVisible()) {
    await stigmaAccordion.click();
    await page.waitForTimeout(300);
    const stigmaSelect = page.locator('label:has-text("क्या पिछले महीने में कोई भेदभाव") ~ select');
    await stigmaSelect.selectOption('yes');
    await page.waitForTimeout(300);
    const discLabels = await page.locator('div:has-text("किसके द्वारा") ~ div label:has(input)').allTextContents();
    console.log(`Hindi Discrimination sources count: ${discLabels.length}`);
    console.log('  Items [0..2]:', discLabels.slice(0, 3).map(s => s.trim()).join(' | '));
  }

  // Check Purpose Select in Hindi
  const purposeSelect = page.locator('select').filter({ hasText: '1. परामर्श' }).first();
  const purposeOpts = await purposeSelect.locator('option').allTextContents();
  console.log(`Hindi Purpose options (${purposeOpts.length}):`, purposeOpts.slice(0, 3).join(' | '));

  await page.screenshot({ path: 'frontend/test-evidence/evidence_dropdowns_hindi.png', fullPage: true });
  console.log('Screenshot saved to frontend/test-evidence/evidence_dropdowns_hindi.png');

  await browser.close();
  console.log('Hindi verification complete!');
})();
