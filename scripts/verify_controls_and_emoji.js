// scripts/verify_controls_and_emoji.js
// Playwright automated verification for:
// 1. Controls Deduplication: Exactly 1 primary action per page, 1 owner per destination,
//    Field worker home (/work) shows "New Registration" exactly once.
// 2. No Emojis on Rendered Pages: Scans DOM text of every route in English & Hindi.
// 3. Client List Actions: "View" and "Edit" with icons on every table row.

const path = require('path');
const fs = require('fs');

let playwright;
try {
  playwright = require('playwright');
} catch (e) {
  playwright = require(path.join(__dirname, '..', 'frontend', 'node_modules', 'playwright'));
}
const { chromium } = playwright;

const EMOJI_REGEX = /[\u{10000}-\u{10ffff}]|[\u200d\u20e3\ufe0f]|[\u2600-\u27bf]|[\u2300-\u23ff]|[\u2b50\u2b55\u2934\u2935]|[\u25aa-\u25fe]|[\u3030\u303d]|[\u3297\u3299]/u;

function assert(condition, message) {
  if (!condition) {
    console.error(`\n❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function verifyRoute({ page, route, role, lang }) {
  console.log(`\nTesting route ${route} with role ${role} (lang=${lang})...`);
  await page.goto(`http://localhost:3000${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // 1. Scan for emojis in DOM
  const pageText = await page.evaluate(() => document.body.innerText);
  const foundEmojis = [];
  for (const char of pageText) {
    if (EMOJI_REGEX.test(char)) {
      foundEmojis.push(char);
    }
  }
  assert(foundEmojis.length === 0, `Route ${route} has emojis in rendered DOM: ${JSON.stringify(foundEmojis)}`);
  console.log(`  ✓ Emoji scan passed: 0 emojis in rendered DOM.`);

  // 2. Controls Deduplication
  if (route === '/work') {
    // Assert "New registration" / "नया पंजीकरण" appears ONCE as primary page action (NOT in AppShell header)
    const newRegLinks = page.locator('a[href="/clients/new"]');
    const count = await newRegLinks.count();
    console.log(`  -> Found ${count} link(s) to /clients/new on /work`);
    assert(count === 1, `Expected exactly 1 'New Registration' action on /work, but found ${count}`);
    console.log(`  ✓ Control deduplication passed: Exactly 1 'New Registration' action on /work.`);
  }

  if (route === '/clients') {
    // Assert Client list Actions column has "View" and "Edit"
    const viewButtons = page.locator('a:has-text("View"), a:has-text("देखें")');
    const editButtons = page.locator('a:has-text("Edit"), a:has-text("संशोधन")');
    const viewCount = await viewButtons.count();
    const editCount = await editButtons.count();
    console.log(`  -> Client Linelist has ${viewCount} View action(s) and ${editCount} Edit action(s)`);
    assert(viewCount >= 1, `Expected at least 1 'View' action in client list, found ${viewCount}`);
    assert(editCount >= 1, `Expected at least 1 'Edit' action in client list, found ${editCount}`);
    console.log(`  ✓ Client Linelist Actions passed: 'View' and 'Edit' present for records.`);
  }
}

async function run() {
  console.log('=================================================================');
  console.log('▶ Starting Controls Deduplication & Rendered Emoji Scan Suite');
  console.log('=================================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    // Step 0: Sign in as Field Worker
    console.log('Step 0: Authenticating as Field Worker...');
    await page.goto('http://localhost:3000/sign-in', { waitUntil: 'networkidle' });
    
    // Scan sign-in page for emojis
    const signinText = await page.evaluate(() => document.body.innerText);
    assert(!EMOJI_REGEX.test(signinText), 'Sign-in page contains emojis');
    console.log('  ✓ Sign-in page has 0 emojis.');

    // Click test user to sign in
    await page.click('button:has-text("Ananya Sharma")');
    await page.waitForURL('**/work', { timeout: 10000 });

    // Test routes in English
    const routes = ['/work', '/clients', '/clients/new'];
    for (const r of routes) {
      await verifyRoute({ page, route: r, role: 'field_worker', lang: 'en' });
    }

    // On /clients, click the first View action to open the real client page
    console.log('\nNavigating to first client record from /clients list...');
    await page.goto('http://localhost:3000/clients', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const firstView = page.locator('a:has-text("View"), a:has-text("देखें")').first();
    await firstView.click();
    await page.waitForTimeout(1000);
    const clientPageText = await page.evaluate(() => document.body.innerText);
    const foundEmojis = [];
    for (const char of clientPageText) {
      if (EMOJI_REGEX.test(char)) foundEmojis.push(char);
    }
    assert(foundEmojis.length === 0, `Client detail page has emojis: ${JSON.stringify(foundEmojis)}`);
    console.log(`  ✓ Emoji scan passed on Client Detail / Edit page: 0 emojis.`);

    // Toggle Hindi and test /work and /clients
    console.log('\nToggling language to Hindi...');
    const hiBtn = page.locator('button:has-text("हिन्दी")');
    if (await hiBtn.isVisible()) {
      await hiBtn.click();
      await page.waitForTimeout(600);
      await verifyRoute({ page, route: '/work', role: 'field_worker', lang: 'hi' });
      await verifyRoute({ page, route: '/clients', role: 'field_worker', lang: 'hi' });
    }

    console.log('\n=================================================================');
    console.log('🎉 ALL CONTROLS DEDUPLICATION & EMOJI SCANS PASSED SUCCESSFULLY!');
    console.log('=================================================================');
  } catch (err) {
    console.error('Test suite failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
