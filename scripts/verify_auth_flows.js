// scripts/verify_auth_flows.js
// Automated verification of 2-step email OTP signup, dual-factor field worker login, and leadership OTP flow

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

async function run() {
  console.log(`\n======================================================`);
  console.log(`▶ CSC 2.0 Auth Flow & Dual-Factor Verification`);
  console.log(`Backend: ${BACKEND_URL}`);
  console.log(`======================================================\n`);

  const results = [];

  // TEST 1: State Team Signup Step 1 (Request OTP)
  console.log('--- TEST 1: State Team Signup Step 1 (Request OTP) ---');
  const testEmail = `test.statemanager.${Date.now()}@allianceindia.test`;
  const reqOtpRes = await fetch(`${BACKEND_URL}/api/v1/evaluation/state-team/signup/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Aarav',
      lastName: 'Patel',
      workEmail: testEmail,
      stateCode: 'MH',
      organization: 'Maharashtra SACS Team',
      password: 'SecureTestPassword123!',
      confirmPassword: 'SecureTestPassword123!'
    })
  });
  const reqOtpData = await reqOtpRes.json();
  const test1Pass = reqOtpRes.status === 200 && reqOtpData.status === 'OTP_SENT';
  results.push({ name: 'State Team Signup Step 1 Dispatches Email OTP', pass: test1Pass, details: reqOtpData.message });
  console.log(test1Pass ? ' PASS: OTP dispatched' : ' FAIL: ' + JSON.stringify(reqOtpData));

  // TEST 2: Reject Demo Code 123456 for Email OTP
  console.log('\n--- TEST 2: Demo 123456 Strictly Rejected for Email OTP ---');
  const reject123456Res = await fetch(`${BACKEND_URL}/api/v1/evaluation/state-team/signup/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workEmail: testEmail,
      otp: '123456'
    })
  });
  const reject123456Data = await reject123456Res.json();
  const test2Pass = reject123456Res.status === 400 || reject123456Res.status === 401 || reject123456Res.status === 403;
  results.push({ name: 'Email OTP Strictly Rejects Fixed Code 123456', pass: test2Pass, details: `HTTP ${reject123456Res.status}: ${reject123456Data.message || 'Rejected'}` });
  console.log(test2Pass ? ' PASS: 123456 rejected for email' : ' FAIL: Accepted demo code for email!');

  // TEST 3: Retrieve actual OTP from OtpChallenge to test valid verification
  console.log('\n--- TEST 3: Complete State Team Verification with Real OTP ---');
  // Read OTP challenge directly via psql or backend check
  const { execSync } = require('child_process');
  let realOtp = null;
  try {
    const psqlOutput = execSync(
      `"C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe" -U csc2_app -d csc2_dev -h localhost -t -A -c "SELECT c.salt FROM csc2.otp_challenge c WHERE LOWER(c.email) = '${testEmail.toLowerCase()}' AND c.consumed_at IS NULL ORDER BY c.created_at DESC LIMIT 1;"`,
      { env: { ...process.env, PGPASSWORD: 'csc2_app_secret_pass' }, encoding: 'utf-8' }
    ).trim();

    // Since OTP is hashed, let's find the OTP by brute-checking 6 digits with cryptoService or checking NotificationOutbox payload!
    const outboxJson = execSync(
      `"C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe" -U csc2_app -d csc2_dev -h localhost -t -A -c "SELECT payload FROM csc2.notification_outbox WHERE LOWER(recipient) = '${testEmail.toLowerCase()}' ORDER BY created_at DESC LIMIT 1;"`,
      { env: { ...process.env, PGPASSWORD: 'csc2_app_secret_pass' }, encoding: 'utf-8' }
    ).trim();
    if (outboxJson) {
      const parsed = JSON.parse(outboxJson);
      realOtp = parsed.otp;
      console.log(` Found real email OTP from notification outbox: ${realOtp}`);
    }
  } catch (e) {
    console.error('Could not query psql:', e.message);
  }

  let enrolmentToken = null;
  let qrCodeDataUrl = null;
  if (realOtp) {
    const verifyRes = await fetch(`${BACKEND_URL}/api/v1/evaluation/state-team/signup/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workEmail: testEmail,
        otp: realOtp
      })
    });
    const verifyData = await verifyRes.json();
    const test3Pass = verifyRes.status === 200 && !!verifyData.token && !!verifyData.enrolmentToken && !!verifyData.qrCodeDataUrl;
    enrolmentToken = verifyData.enrolmentToken;
    qrCodeDataUrl = verifyData.qrCodeDataUrl;
    results.push({
      name: 'State Team Signup Step 2 Verifies OTP, Issues JWT & Barcode',
      pass: test3Pass,
      details: `Token: ${verifyData.enrolmentToken ? verifyData.enrolmentToken.substring(0, 15) + '...' : 'none'}, QR Data URL present: ${!!qrCodeDataUrl}`
    });
    console.log(test3Pass ? ` PASS: Verified! Token=${enrolmentToken}` : ' FAIL: ' + JSON.stringify(verifyData));

    // TEST 4: Single Use - Reusing same OTP must fail
    console.log('\n--- TEST 4: Single-Use OTP Enforcement ---');
    const reuseRes = await fetch(`${BACKEND_URL}/api/v1/evaluation/state-team/signup/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workEmail: testEmail,
        otp: realOtp
      })
    });
    const test4Pass = reuseRes.status === 401 || reuseRes.status === 400;
    results.push({ name: 'Email OTP Single-Use Enforced (Replay Rejected)', pass: test4Pass, details: `HTTP ${reuseRes.status}` });
    console.log(test4Pass ? ' PASS: Replay rejected' : ' FAIL: Replay accepted!');
  } else {
    results.push({ name: 'State Team Signup Step 2', pass: false, details: 'Could not obtain OTP' });
  }

  // TEST 5: Dual-Factor Field Worker Sign-in
  console.log('\n--- TEST 5: Field Worker Dual-Factor Login ---');
  const fieldPhone = '+919820011223';
  // Send SMS OTP
  const sendSmsRes = await fetch(`${BACKEND_URL}/api/v1/auth/field/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: fieldPhone, deviceId: 'test-device' })
  });
  console.log(` SMS OTP request status: ${sendSmsRes.status}`);

  // Test 5A: OTP alone WITHOUT enrolment token must FAIL
  console.log('--- TEST 5A: OTP Alone Without Enrolment Token Must Fail ---');
  const noTokenRes = await fetch(`${BACKEND_URL}/api/v1/auth/field/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: fieldPhone,
      code: '123456',
      enrolmentToken: '',
      deviceId: 'test-device'
    })
  });
  const noTokenData = await noTokenRes.json();
  const test5aPass = noTokenData.success === false;
  results.push({ name: 'Field Worker Login Rejects Missing Barcode/Token', pass: test5aPass, details: noTokenData.message });
  console.log(test5aPass ? ' PASS: Barcode alone fails' : ' FAIL: Logged in without barcode!');

  // Test 5B: Valid Enrolment Token + SMS OTP Succeeds
  if (enrolmentToken) {
    console.log('--- TEST 5B: Valid Enrolment Token + SMS OTP Dual Factor ---');
    const dualRes = await fetch(`${BACKEND_URL}/api/v1/auth/field/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: fieldPhone,
        code: '123456',
        enrolmentToken: enrolmentToken,
        firstName: 'Sunita',
        lastName: 'Devi',
        deviceId: 'test-device'
      })
    });
    const dualData = await dualRes.json();
    const test5bPass = dualData.success === true && !!dualData.tokens;
    results.push({ name: 'Field Worker Login Succeeds with BOTH Barcode + OTP', pass: test5bPass, details: `Session token: ${dualData.tokens ? 'Issued' : 'Missing'}` });
    console.log(test5bPass ? ' PASS: Dual factor login succeeded' : ' FAIL: ' + JSON.stringify(dualData));
  }

  // TEST 6: Leadership Login Flow
  console.log('\n--- TEST 6: Leadership Login OTP Flow ---');
  const leaderReqRes = await fetch(`${BACKEND_URL}/api/v1/evaluation/leadership/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'faridsayyed1010@gmail.com' })
  });
  const leaderReqData = await leaderReqRes.json();
  const test6aPass = leaderReqRes.status === 200;
  results.push({ name: 'Leadership OTP Requested for Allowlisted Email', pass: test6aPass, details: leaderReqData.message });
  console.log(test6aPass ? ' PASS: Leadership OTP requested' : ' FAIL: ' + JSON.stringify(leaderReqData));

  // Retrieve leadership OTP
  let leaderOtp = null;
  try {
    const outboxJson = execSync(
      `"C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe" -U csc2_app -d csc2_dev -h localhost -t -A -c "SELECT payload FROM csc2.notification_outbox WHERE LOWER(recipient) = 'faridsayyed1010@gmail.com' AND template = 'LEADERSHIP_OTP' ORDER BY created_at DESC LIMIT 1;"`,
      { env: { ...process.env, PGPASSWORD: 'csc2_app_secret_pass' }, encoding: 'utf-8' }
    ).trim();
    if (outboxJson) {
      leaderOtp = JSON.parse(outboxJson).otp;
      console.log(` Found leadership OTP: ${leaderOtp}`);
    }
  } catch (e) {}

  if (leaderOtp) {
    const leaderVerifyRes = await fetch(`${BACKEND_URL}/api/v1/evaluation/leadership/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'faridsayyed1010@gmail.com',
        otp: leaderOtp
      })
    });
    const leaderVerifyData = await leaderVerifyRes.json();
    const test6bPass = leaderVerifyRes.status === 200 && leaderVerifyData.role === 'LEADERSHIP' && !!leaderVerifyData.token;
    results.push({ name: 'Leadership OTP Verified & Grants LEADERSHIP Role', pass: test6bPass, details: `Role: ${leaderVerifyData.role}` });
    console.log(test6bPass ? ' PASS: Leadership access granted' : ' FAIL: ' + JSON.stringify(leaderVerifyData));
  }

  console.log(`\n======================================================`);
  console.log(`SUMMARY OF RESULTS`);
  console.log(`======================================================`);
  results.forEach((r, i) => {
    console.log(`${r.pass ? '✓' : '✗'} [Test ${i + 1}] ${r.name}: ${r.pass ? 'PASS' : 'FAIL'} (${r.details})`);
  });
  const allPassed = results.every(r => r.pass);
  console.log(`\nOverall: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}\n`);
  process.exit(allPassed ? 0 : 1);
}

run().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
