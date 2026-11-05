const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
  console.log('Starting Playwright dropdown validation...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Preset fake session for testing
  await page.addInitScript(() => {
    localStorage.setItem('csc_token', 'mock-token-for-test');
    localStorage.setItem('csc_user', JSON.stringify({
      id: 'usr-1',
      name: 'Ramesh Field Officer',
      role: 'FIELD_WORKER',
      centerId: 'csc-delhi-1'
    }));
  });

  const report = [];

  try {
    // 1. Visit /clients/new
    console.log('Navigating to http://localhost:3000/clients/new ...');
    await page.goto('http://localhost:3000/clients/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Take screenshot of new client page
    await page.screenshot({ path: 'frontend/test-evidence/dropdown_audit_new_client.png', fullPage: false });

    // Helper to inspect select
    async function checkSelect(selector, expectedMinOpts, label) {
      const el = page.locator(selector).first();
      if (await el.count() > 0) {
        const options = await el.locator('option').allTextContents();
        const nonBlank = options.filter(o => o.trim() && !o.includes('--'));
        report.push({ label, selector, foundCount: nonBlank.length, expectedMinOpts, pass: nonBlank.length >= expectedMinOpts, options: nonBlank });
        console.log(`[PASS: ${nonBlank.length >= expectedMinOpts}] ${label}: found ${nonBlank.length} options (expected >= ${expectedMinOpts})`);
      } else {
        report.push({ label, selector, foundCount: 0, expectedMinOpts, pass: false, error: 'Element not found' });
        console.log(`[FAIL] ${label}: selector ${selector} not found`);
      }
    }

    // Helper to inspect button groups (when choices <= 4)
    async function checkButtonGroup(wrapperId, expectedCount, label) {
      const el = page.locator(`#${wrapperId} button`);
      const count = await el.count();
      if (count > 0) {
        const texts = await el.allTextContents();
        report.push({ label, wrapperId, foundCount: count, expectedCount, pass: count === expectedCount, texts });
        console.log(`[PASS: ${count === expectedCount}] ${label}: found ${count} buttons (expected ${expectedCount}): ${texts.join(', ')}`);
      } else {
        report.push({ label, wrapperId, foundCount: 0, expectedCount, pass: false, error: 'Buttons not found' });
        console.log(`[FAIL] ${label}: wrapper #${wrapperId} buttons not found`);
      }
    }

    // Helper to inspect checkboxes (select_multiple)
    async function checkCheckboxes(wrapperId, expectedCount, label) {
      const el = page.locator(`#${wrapperId} input[type="checkbox"]`);
      const count = await el.count();
      if (count > 0) {
        report.push({ label, wrapperId, foundCount: count, expectedCount, pass: count >= expectedCount });
        console.log(`[PASS: ${count >= expectedCount}] ${label}: found ${count} checkboxes (expected >= ${expectedCount})`);
      } else {
        report.push({ label, wrapperId, foundCount: 0, expectedCount, pass: false, error: 'Checkboxes not found' });
        console.log(`[FAIL] ${label}: wrapper #${wrapperId} checkboxes not found`);
      }
    }

    // Section A checks
    await checkButtonGroup('wrapper-a02_reg_place', 3, 'A2. Registration done at');
    await checkButtonGroup('wrapper-a05_gender', 3, 'A5. Gender');
    await checkButtonGroup('wrapper-a07_res_type', 3, 'A7. Residence Type');
    await checkButtonGroup('wrapper-a13_client_type', 2, 'A13. Client Type');
    await checkSelect('select#field-a14_kp', 7, 'A14. Typology KP');
    await checkSelect('select#field-a15_typ_other', 6, 'A15. Typology Other');
    await checkButtonGroup('wrapper-a16_caretaker', 2, 'A16. Caretaker');
    await checkButtonGroup('wrapper-a17_orphan', 3, 'A17. Orphan status');
    await checkSelect('select#field-a_sub_edu', 7, 'A18. Education');
    await checkSelect('select#field-a19_occupation', 14, 'A19. Occupation');
    await checkSelect('select#field-a20_marital', 6, 'A20. Marital status');
    await checkSelect('select#field-a21_income', 6, 'A21. Monthly income');

    // Section B checks (Family members repeat group)
    // Click "Add family member" if button exists
    const addMemberBtn = page.locator('button:has-text("सदस्य जोड़ें"), button:has-text("Add Member")').first();
    if (await addMemberBtn.count() > 0) {
      await addMemberBtn.click();
      await page.waitForTimeout(500);
      console.log('Clicked Add Family Member button.');
      // Check relationship select
      await checkSelect('select:near(:text("Relationship"))', 6, 'B. Family Relationship');
      await checkSelect('select:near(:text("HIV Status"))', 4, 'B. Family HIV Status');
    }

    // Section C checks
    await checkSelect('select#field-c3_route', 8, 'C3. Route of Transmission');
    await checkButtonGroup('wrapper-c6_artc_type', 4, 'C6. Type of ARTC');
    await checkButtonGroup('wrapper-c10_who_stage', 4, 'C10. WHO Clinical Stage');
    await checkSelect('select#field-c14d_att_status', 6, 'C14d. TB Treatment Status');

    // Section D checks (Entitlements)
    await checkCheckboxes('wrapper-d2a_docs', 13, 'D2a. Social Entitlements');

    // Section F checks (Stigma)
    await checkCheckboxes('wrapper-f2_from', 9, 'F2. Discrimination from');

    // Section G checks (Disability)
    await checkCheckboxes('wrapper-g2_type', 11, 'G2. Disability types');

    // Section H checks (Death / Migration)
    await checkSelect('select#field-h2_reason', 5, 'H2. Reason for death');
    await checkButtonGroup('wrapper-h6_place', 4, 'H6. Place of death');

    // Section J checks (Follow-up purpose & services)
    const addSvcBtn = page.locator('button:has-text("सेवा जोड़ें"), button:has-text("Add Service")').first();
    if (await addSvcBtn.count() > 0) {
      await addSvcBtn.click();
      await page.waitForTimeout(500);
      console.log('Clicked Add Service button in J5.');
      await checkSelect('select:near(:text("Service Purpose"))', 13, 'J5. Service Purpose');
    }

    // Now test FollowUpModal on /work
    console.log('\nNavigating to http://localhost:3000/work to test FollowUpModal ...');
    await page.goto('http://localhost:3000/work', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const recordVisitBtn = page.locator('button:has-text("Record visit"), button:has-text("विज़िट दर्ज करें")').first();
    if (await recordVisitBtn.count() > 0) {
      await recordVisitBtn.click();
      await page.waitForTimeout(1000);
      console.log('FollowUpModal opened.');

      await page.screenshot({ path: 'frontend/test-evidence/dropdown_audit_modal_step1.png' });

      // Step 1: Click "Visited"
      const visitedBtn = page.locator('button:has-text("Visited / spoke"), button:has-text("मुलाकात / बात की")').first();
      if (await visitedBtn.count() > 0) {
        await visitedBtn.click();
        await page.waitForTimeout(500);

        // Check Step 2 Place of Contact
        await checkSelect('select:near(:text("Place of Contact"))', 4, 'Modal Place of Contact');

        // Check ART Status & Regimen line in Accordion 2
        const artAccordion = page.locator('button:has-text("ART Status & Regimen"), button:has-text("एआरटी स्थिति एवं रेजिमेन")').first();
        if (await artAccordion.count() > 0) {
          await artAccordion.click();
          await page.waitForTimeout(300);
          await checkSelect('select:near(:text("ART Status"))', 3, 'Modal ART Status');
          await checkSelect('select:near(:text("ART Regimen Line"))', 3, 'Modal ART Regimen Line');
        }

        // Check Stigma sources in Accordion 6
        const stigmaAccordion = page.locator('button:has-text("Stigma & Discrimination"), button:has-text("भेदभाव / कलंक")').first();
        if (await stigmaAccordion.count() > 0) {
          await stigmaAccordion.click();
          await page.waitForTimeout(300);
          // Set faced stigma to yes
          const stigmaSelect = page.locator('select:near(:text("past month"))').first();
          if (await stigmaSelect.count() > 0) {
            await stigmaSelect.selectOption('yes');
            await page.waitForTimeout(300);
            const stigmaBoxes = await page.locator('input[type="checkbox"]:near(:text("Source of discrimination"))').count();
            console.log(`[PASS: ${stigmaBoxes >= 9}] Modal Stigma Sources checkboxes: found ${stigmaBoxes} (expected >= 9)`);
            report.push({ label: 'Modal Stigma Sources checkboxes', foundCount: stigmaBoxes, expectedCount: 9, pass: stigmaBoxes >= 9 });
          }
        }

        // Check Step 3 (Next Action)
        const nextStepBtn = page.locator('button:has-text("Continue to Next Action"), button:has-text("अगली कार्रवाई")').first();
        if (await nextStepBtn.count() > 0) {
          await nextStepBtn.click();
          await page.waitForTimeout(500);

          await page.screenshot({ path: 'frontend/test-evidence/dropdown_audit_modal_step3.png' });

          await checkSelect('select:near(:text("Follow-up Purpose"))', 13, 'Modal Follow-up Purpose J5');
          await checkSelect('select:near(:text("Service Category"))', 7, 'Modal Service Category');

          // Select category "cc" and check specific services
          const catSelect = page.locator('select:near(:text("Service Category"))').first();
          await catSelect.selectOption('cc');
          await page.waitForTimeout(300);
          await checkSelect('select:near(:text("Specific Service Code"))', 12, 'Modal Category CC Services');

          // Select category "re" and check specific services
          await catSelect.selectOption('re');
          await page.waitForTimeout(300);
          await checkSelect('select:near(:text("Specific Service Code"))', 13, 'Modal Category RE Services');
        }
      }
    } else {
      console.log('Record visit button not found on /work (no mock tasks loaded).');
    }

    fs.writeFileSync('frontend/test-evidence/dropdown_audit_report.json', JSON.stringify(report, null, 2));
    console.log('\nAudit complete! Total checks:', report.length, 'Passed:', report.filter(r => r.pass).length, 'Failed:', report.filter(r => !r.pass).length);

  } catch (err) {
    console.error('Error during validation:', err);
  } finally {
    await browser.close();
  }
})();
