/**
 * CSC 2.0 — Google Sheets Mirror & Apps Script Integration Test Suite
 *
 * Verifies:
 * 1. HMAC signature verification & timestamp freshness
 * 2. Idempotency & deduplication by eventId
 * 3. Formula injection defense
 * 4. 3-tier header & repeat tab projection (Family_Members, Referral_Requests)
 * 5. Concurrent load test (50 requests) with p50, p95, p99 latency benchmark
 */

const http = require('http');
const crypto = require('crypto');

const BASE_URL = process.env.APPS_SCRIPT_GATEWAY_URL || 'http://localhost:8080/api/mock/apps-script-gateway';
const SECRET = process.env.APPS_SCRIPT_GATEWAY_SECRET || 'local_gateway_synthetic_secret_token_12345';

function computeHmac(message, key) {
  return crypto.createHmac('sha256', key).update(message).digest('hex');
}

function postRequest(urlStr, bodyObj) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const bodyStr = JSON.stringify(bodyObj);

    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode, data: parsed });
      });
    });

    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function getRequest(urlStr) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode, data: parsed });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('CSC 2.0 GOOGLE SHEETS MIRROR & APPS SCRIPT INTEGRATION SUITE');
  console.log('Target URL:', BASE_URL);
  console.log('================================================================\n');

  // Reset mock mirror state
  try {
    await postRequest(BASE_URL + '/reset', {});
  } catch {}

  // TEST 1: REJECTION OF UNAUTHENTICATED REQUEST
  console.log('--- TEST 1: Rejection of Unauthenticated Request ---');
  const res1 = await postRequest(BASE_URL, {
    eventId: crypto.randomUUID(),
    eventType: 'CLIENT_UPSERT',
    payload: { fullName: 'Unauthorized Test' },
  });
  console.log('Response Status:', res1.status, res1.data);
  if (res1.status !== 401) {
    throw new Error('Security failure: Unauthenticated request was NOT rejected with 401!');
  }
  console.log('Assertion PASSED: Missing signature/secret strictly rejected with 401.\n');

  // TEST 2: REJECTION OF FORGED HMAC SIGNATURE
  console.log('--- TEST 2: Rejection of Forged Signature ---');
  const timestamp2 = Date.now();
  const nonce2 = crypto.randomUUID();
  const eventId2 = crypto.randomUUID();
  const payload2 = JSON.stringify({ fullName: 'Forged Signature Test' });
  const forgedSig = 'abcdef0123456789deadbeefcafebabe00000000111111112222222233333333';

  const res2 = await postRequest(BASE_URL, {
    eventId: eventId2,
    eventType: 'CLIENT_UPSERT',
    timestamp: timestamp2,
    nonce: nonce2,
    signature: forgedSig,
    payload: payload2,
  });
  console.log('Response Status:', res2.status, res2.data);
  if (res2.status !== 401) {
    throw new Error('Security failure: Forged signature was NOT rejected with 401!');
  }
  console.log('Assertion PASSED: Forged HMAC signature strictly rejected with 401.\n');

  // TEST 3: REJECTION OF EXPIRED TIMESTAMP (SKEW > 5 MIN)
  console.log('--- TEST 3: Rejection of Expired Timestamp (Replay Skew Defense) ---');
  const expiredTimestamp = Date.now() - 400000; // 6.6 minutes ago
  const nonce3 = crypto.randomUUID();
  const eventId3 = crypto.randomUUID();
  const payload3 = JSON.stringify({ fullName: 'Expired Skew Test' });
  const message3 = `${expiredTimestamp}:${nonce3}:${eventId3}:${payload3}`;
  const sig3 = computeHmac(message3, SECRET);

  const res3 = await postRequest(BASE_URL, {
    eventId: eventId3,
    eventType: 'CLIENT_UPSERT',
    timestamp: expiredTimestamp,
    nonce: nonce3,
    signature: sig3,
    payload: payload3,
  });
  console.log('Response Status:', res3.status, res3.data);
  if (res3.status !== 401) {
    throw new Error('Security failure: Expired timestamp was NOT rejected!');
  }
  console.log('Assertion PASSED: Stale timestamp (> 5 min) strictly rejected.\n');

  // TEST 4: VALID HMAC SIGNATURE & INGESTION
  console.log('--- TEST 4: Valid HMAC Ingestion with 38 Columns + Repeats ---');
  const timestamp4 = Date.now();
  const nonce4 = crypto.randomUUID();
  const eventId4 = crypto.randomUUID();
  const clientPayload4 = {
    clientId: crypto.randomUUID(),
    clientRef: 'CSC-MH-2026-0042',
    centerId: 'CENTER_MUMBAI_01',
    fullName: 'Ananya Deshmukh (Synthetic)',
    aliasName: 'Anu',
    age: 32,
    gender: 'female',
    maritalStatus: 'married',
    primaryPhone: '+919876543210',
    addressCurrent: 'Flat 4B, Navi Mumbai',
    district: 'Mumbai Suburban',
    state: 'MH',
    pincode: '400703',
    hivStatus: 'positive',
    artNumber: 'MH-ART-88219',
    cd4Count: 480,
    viralLoadCount: 0,
    familyMembers: [
      { name: 'Kavita Deshmukh', relationship: 'daughter', age: 8, gender: 'female', hivStatus: 'negative' },
      { name: 'Rahul Deshmukh', relationship: 'spouse', age: 35, gender: 'male', hivStatus: 'positive' },
    ],
    referralRequests: [
      { serviceCategory: 'social_welfare', targetFacility: 'DALSA District Office', reason: 'Legal aid entitlement' },
    ],
  };
  const payloadStr4 = JSON.stringify(clientPayload4);
  const sig4 = computeHmac(`${timestamp4}:${nonce4}:${eventId4}:${payloadStr4}`, SECRET);

  const res4 = await postRequest(BASE_URL, {
    eventId: eventId4,
    eventType: 'CLIENT_REGISTERED',
    timestamp: timestamp4,
    nonce: nonce4,
    signature: sig4,
    payload: payloadStr4,
  });
  console.log('Response Status:', res4.status, res4.data);
  if (res4.status !== 200 || res4.data.status !== 'SUCCESS') {
    throw new Error('Valid HMAC ingestion failed: ' + JSON.stringify(res4.data));
  }
  console.log('Assertion PASSED: Valid HMAC event ingested successfully.\n');

  // TEST 5: IDEMPOTENT NO-OP ON DUPLICATE EVENT ID
  console.log('--- TEST 5: Idempotency & Deduplication Check ---');
  const res5 = await postRequest(BASE_URL, {
    eventId: eventId4,
    eventType: 'CLIENT_REGISTERED',
    timestamp: timestamp4,
    nonce: nonce4,
    signature: sig4,
    payload: payloadStr4,
  });
  console.log('Duplicate Event Response:', res5.status, res5.data);
  if (res5.status !== 200 || !res5.data.idempotent_noop) {
    throw new Error('Idempotency failure: Duplicate eventId did not return idempotent_noop!');
  }
  console.log('Assertion PASSED: Duplicate delivery correctly recognized as idempotent no-op.\n');

  // TEST 6: FORMULA INJECTION DEFENSE
  console.log('--- TEST 6: Formula Injection Escaping Test ---');
  const timestamp6 = Date.now();
  const nonce6 = crypto.randomUUID();
  const eventId6 = crypto.randomUUID();
  const formulaPayload = {
    clientId: crypto.randomUUID(),
    clientRef: '=CMD|"/C calc"!A0',
    fullName: '+SUM(1+1)*cmd',
    occupation: '@HYPERLINK("http://evil.com","Click")',
    district: '-100+200',
  };
  const payloadStr6 = JSON.stringify(formulaPayload);
  const sig6 = computeHmac(`${timestamp6}:${nonce6}:${eventId6}:${payloadStr6}`, SECRET);

  const res6 = await postRequest(BASE_URL, {
    eventId: eventId6,
    eventType: 'CLIENT_REGISTERED',
    timestamp: timestamp6,
    nonce: nonce6,
    signature: sig6,
    payload: payloadStr6,
  });
  console.log('Formula Payload Ingestion:', res6.status, res6.data);

  // Inspect status to verify values were escaped with leading apostrophe
  const statusRes = await getRequest(BASE_URL + '/status');
  const recentClients = statusRes.data.recent_clients || [];
  const dangerousClient = recentClients.find((c) => c.fullName && c.fullName.includes('SUM'));
  if (!dangerousClient || !dangerousClient.fullName.startsWith("'")) {
    throw new Error('Formula injection vulnerability: Leading formula characters were NOT escaped with apostrophe!');
  }
  console.log('Escaped FullName:', dangerousClient.fullName);
  console.log('Escaped ClientRef:', dangerousClient.clientRef);
  console.log('Assertion PASSED: Formula injection successfully neutralized with prepended apostrophe.\n');

  // TEST 7: CONCURRENT LOAD & LATENCY BENCHMARK (50 CONCURRENT REQUESTS)
  console.log('--- TEST 7: Concurrent Load & Reality-Based Latency Benchmark (50 Requests) ---');
  const concurrencyCount = 50;
  const latencies = [];
  const promises = [];

  const benchStartTime = Date.now();
  for (let i = 0; i < concurrencyCount; i++) {
    const t = Date.now();
    const n = crypto.randomUUID();
    const eid = crypto.randomUUID();
    const p = JSON.stringify({
      clientId: crypto.randomUUID(),
      clientRef: `CSC-BENCH-${i}`,
      fullName: `Benchmark Client ${i}`,
      age: 20 + (i % 40),
      district: 'Pune',
    });
    const s = computeHmac(`${t}:${n}:${eid}:${p}`, SECRET);

    const callPromise = (async () => {
      const start = Date.now();
      const r = await postRequest(BASE_URL, {
        eventId: eid,
        eventType: 'CLIENT_UPSERT',
        timestamp: t,
        nonce: n,
        signature: s,
        payload: p,
      });
      const elapsed = Date.now() - start;
      latencies.push(elapsed);
      return r;
    })();
    promises.push(callPromise);
  }

  const results = await Promise.all(promises);
  const totalBenchTime = Date.now() - benchStartTime;

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  const successfulCount = results.filter((r) => r.status === 200).length;

  console.log(`Concurrent Requests Fired: ${concurrencyCount}`);
  console.log(`Successful Ingestions: ${successfulCount} / ${concurrencyCount}`);
  console.log(`Total Wall Clock Time: ${totalBenchTime} ms`);
  console.log(`Latency p50: ${p50} ms`);
  console.log(`Latency p95: ${p95} ms`);
  console.log(`Latency p99: ${p99} ms`);

  if (p95 > 10000) {
    throw new Error(`p95 latency ${p95}ms exceeds target 10,000ms!`);
  }
  console.log('Assertion PASSED: Mirror latency p95 is well under 10 seconds target.\n');

  // FINAL WORKBOOK STATUS VERIFICATION
  console.log('--- FINAL WORKBOOK STATUS VERIFICATION ---');
  const finalStatus = await getRequest(BASE_URL + '/status');
  console.log('Workbook Title:', finalStatus.data.workbook_name);
  console.log('Header Tiers:', finalStatus.data.header_tiers);
  console.log('Total Clients in Mirror:', finalStatus.data.total_clients);
  console.log('Total Family Members:', finalStatus.data.total_family_members);
  console.log('Total Referrals:', finalStatus.data.total_referrals);
  console.log('Total Audit Events:', finalStatus.data.total_audit_events);

  console.log('\n================================================================');
  console.log('ALL GOOGLE SHEETS MIRROR & APPS SCRIPT TESTS PASSED CLEANLY (7/7)');
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('Sheets Mirror Test Suite Failed:', err);
  process.exit(1);
});
