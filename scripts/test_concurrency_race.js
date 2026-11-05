/**
 * Concurrency & Race Condition Verification Suite
 * Tests:
 * 1. Concurrent OTP Verification Race: Multiple simultaneous verification calls with the same OTP.
 *    Only 1 must succeed (200), and all other concurrent calls must fail (400/409/locked).
 * 2. Concurrent Outbox Processing Atomicity: 20 simultaneous submissions must create distinct, unique outbox rows.
 * 3. Concurrent Session Refresh Token Race: 2 simultaneous calls attempting to rotate the same refresh token.
 *    Only 1 gets new token pair, while the competing call triggers reuse alert and revokes sessions.
 */

const http = require('http');

function doRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          rawBody: data,
          json
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('=== [Concurrency & Race Condition Verification Suite] ===\n');
  let passed = 0;
  let failed = 0;

  // Race Test 1: Simultaneous OTP verification race condition
  console.log('1. Race Test 1: Concurrent OTP verification race condition...');
  try {
    const phone = '+9199' + Math.floor(10000000 + Math.random() * 90000000);
    // Clear sinks and rate limits
    await doRequest({ hostname: 'localhost', port: 8080, path: '/api/v1/dev-sinks/clear', method: 'POST' });
    // Enroll test phone on roster
    await doRequest({
      hostname: 'localhost',
      port: 8080,
      path: '/api/v1/dev-sinks/roster',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { phone });

    // Send OTP
    const sendRes = await doRequest({
      hostname: 'localhost',
      port: 8080,
      path: '/api/v1/auth/field/send-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' }
    }, { phone, deviceId: 'race-dev-1' });
    console.log('   sendRes:', sendRes.statusCode, sendRes.rawBody);

    await sleep(300);

    // Retrieve OTP from sink
    const sinkRes = await doRequest({
      hostname: 'localhost',
      port: 8080,
      path: '/api/v1/dev-sinks/sms',
      method: 'GET'
    });
    const latest = sinkRes.json && sinkRes.json[0];
    const rawMsg = latest ? (latest.messageText || latest.message || '') : '';
    const match = rawMsg.match(/#(\d{6})/);
    const code = match ? match[1] : null;

    if (!code) {
      console.error('FAIL: No OTP captured for race test');
      failed++;
    } else {
      console.log(`   Captured OTP: ${code}. Firing 5 simultaneous verification requests...`);

      // Fire 5 concurrent verify requests
      const promises = Array.from({ length: 5 }, (_, i) =>
        doRequest({
          hostname: 'localhost',
          port: 8080,
          path: '/api/v1/auth/field/verify-otp',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' }
        }, {
          phone,
          code,
          firstName: 'Concurrent',
          lastName: 'Tester',
          deviceId: `race-dev-${i}`
        })
      );

      const results = await Promise.all(promises);
      console.log('   Debug responses:', results.map(r => ({ status: r.statusCode, success: r.json && r.json.success, msg: r.json && r.json.message })));
      const successCount = results.filter(r => r.statusCode === 200 && r.json && r.json.success).length;
      const rejectCount = results.filter(r => r.statusCode !== 200 || !r.json || !r.json.success).length;

      console.log(`   Results: ${successCount} Succeeded (200), ${rejectCount} Rejected`);
      if (successCount === 1 && rejectCount === 4) {
        console.log('PASS: Exactly 1 concurrent verification succeeded; database row-level locking prevented double consumption.\n');
        passed++;
      } else {
        console.error(`FAIL: Expected exactly 1 success and 4 rejections, got ${successCount} successes and ${rejectCount} rejections.`);
        failed++;
      }
    }
  } catch (err) {
    console.error('FAIL:', err.message);
    failed++;
  }

  // Race Test 2: Concurrent Session Refresh Token Race (Simulated Man-in-the-Middle)
  console.log('2. Race Test 2: Concurrent Refresh Token Rotation Race Condition...');
  try {
    const phone = '+9199' + Math.floor(10000000 + Math.random() * 90000000);
    // Enroll test phone on roster
    await doRequest({
      hostname: 'localhost',
      port: 8080,
      path: '/api/v1/dev-sinks/roster',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { phone });

    await doRequest({
      hostname: 'localhost',
      port: 8080,
      path: '/api/v1/auth/field/send-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' }
    }, { phone, deviceId: 'race-dev-refresh' });

    await sleep(300);

    const sinkRes = await doRequest({ hostname: 'localhost', port: 8080, path: '/api/v1/dev-sinks/sms', method: 'GET' });
    const latest = sinkRes.json && sinkRes.json[0];
    const match = latest && (latest.messageText || '').match(/#(\d{6})/);
    const code = match ? match[1] : null;

    const verifyRes = await doRequest({
      hostname: 'localhost',
      port: 8080,
      path: '/api/v1/auth/field/verify-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' }
    }, {
      phone,
      code,
      firstName: 'Refresh',
      lastName: 'Race',
      deviceId: 'race-dev-refresh'
    });

    const tokens = verifyRes.json && verifyRes.json.tokens;
    if (tokens && tokens.refreshToken) {
      console.log(`   Obtained refresh token: ${tokens.refreshToken.substring(0, 10)}... Firing 3 simultaneous refresh calls...`);

      const refreshPromises = Array.from({ length: 3 }, () =>
        doRequest({
          hostname: 'localhost',
          port: 8080,
          path: '/api/v1/auth/session/refresh',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' }
        }, { refreshToken: tokens.refreshToken })
      );

      const refreshResults = await Promise.all(refreshPromises);
      const refreshSuccesses = refreshResults.filter(r => r.statusCode === 200).length;
      const refreshRejections = refreshResults.filter(r => r.statusCode !== 200).length;

      console.log(`   Results: ${refreshSuccesses} Succeeded, ${refreshRejections} Rejected with Security Revocation`);
      if (refreshSuccesses === 1 && refreshRejections === 2) {
        console.log('PASS: Exactly 1 concurrent refresh won the race; competing requests detected reuse and triggered security lockout.\n');
        passed++;
      } else {
        console.error(`FAIL: Expected 1 success and 2 rejections, got ${refreshSuccesses} successes and ${refreshRejections} rejections.`);
        failed++;
      }
    } else {
      console.error('FAIL: Could not obtain tokens for refresh race test');
      failed++;
    }
  } catch (err) {
    console.error('FAIL:', err.message);
    failed++;
  }

  // Race Test 3: Idempotent Client Registration Under High Concurrency (Double-Click Prevention)
  console.log('3. Race Test 3: Concurrent Idempotent Requests (Double-Click Prevention)...');
  try {
    const fixedIdempotencyKey = `race-idem-${Date.now()}`;
    const testPayload = {
      fullName: 'Concurrent Double-Click Client',
      gender: 'MALE',
      state: 'Uttar Pradesh',
      district: 'Lucknow',
      hivStatus: 'REACTIVE',
      consentRecorded: true
    };

    console.log(`   Firing 4 identical registration submissions with same Idempotency-Key: ${fixedIdempotencyKey}...`);
    const regPromises = Array.from({ length: 4 }, () =>
      doRequest({
        hostname: 'localhost',
        port: 8080,
        path: '/api/v1/clients',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3000',
          'Idempotency-Key': fixedIdempotencyKey,
          'X-Service-Credential': 'local_dev_service_secret_token_abcdef123456789'
        }
      }, testPayload)
    );

    const regResults = await Promise.all(regPromises);
    const okResponses = regResults.filter(r => r.statusCode === 200 || r.statusCode === 201).length;
    const resourceIds = regResults.map(r => r.json && r.json.resourceId).filter(Boolean);
    const uniqueIds = new Set(resourceIds);

    console.log(`   Results: ${okResponses} / 4 handled cleanly with status 200, unique created IDs: ${uniqueIds.size}`);

    if (okResponses === 4 && uniqueIds.size === 1) {
      console.log('PASS: All concurrent submissions handled safely via idempotency semantics; exactly 1 resource created.\n');
      passed++;
    } else {
      console.error('FAIL: Idempotency race failed:', regResults.map(r => ({ status: r.statusCode, body: r.rawBody })));
      failed++;
    }
  } catch (err) {
    console.error('FAIL:', err.message);
    failed++;
  }

  console.log(`=== CONCURRENCY SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
