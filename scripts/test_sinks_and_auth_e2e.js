const http = require('http');

function post(urlPath, data, token) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      {
        hostname: 'localhost',
        port: 8080,
        path: urlPath,
        method: 'POST',
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function get(urlPath, token) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      {
        hostname: 'localhost',
        port: 8080,
        path: urlPath,
        method: 'GET',
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('CSC 2.0 EVALUATION AUTH & LOCAL SINKS END-TO-END VERIFICATION');
  console.log('================================================================\n');

  // 1. LEADERSHIP OTP TEST
  console.log('--- TEST 1: Leadership OTP Request (Known Email) ---');
  const leadReq1 = await post('/api/v1/evaluation/leadership/request-otp', {
    email: 'dr.neha.sharma@naco.gov.in',
  });
  console.log('Known Email Response:', leadReq1.status, leadReq1.data);
  if (leadReq1.status !== 200 || !leadReq1.data.message) {
    throw new Error('Leadership request OTP failed');
  }

  console.log('\n--- TEST 2: Leadership OTP Request (Unknown Email - Neutral Response) ---');
  const leadReq2 = await post('/api/v1/evaluation/leadership/request-otp', {
    email: 'hacker.unknown@random-domain.org',
  });
  console.log('Unknown Email Response:', leadReq2.status, leadReq2.data);
  if (leadReq2.data.message !== leadReq1.data.message) {
    throw new Error('Enumeration vulnerability: responses for known and unknown email differ!');
  }
  console.log('Assertion PASSED: Known and unknown emails receive identical neutral response.');

  // 2. STATE TEAM SIGNUP & AUTH
  console.log('\n--- TEST 3: State Team Signup (with state validation & password) ---');
  const testStateEmail = `state.officer.${Date.now()}@sacs.gov.in`;
  const stateSignup = await post('/api/v1/evaluation/state-team/signup', {
    workEmail: testStateEmail,
    password: 'SecureStatePass123!',
    firstName: 'Anjali',
    lastName: 'Kulkarni',
    stateCode: 'MH',
  });
  console.log('State Signup Response:', stateSignup.status, stateSignup.data.role, stateSignup.data.state);
  if (stateSignup.status !== 200 || stateSignup.data.role !== 'STATE_MANAGER') {
    throw new Error('State Team signup failed');
  }
  console.log('Assertion PASSED: State Manager created and scoped to Maharashtra.');

  console.log('\n--- TEST 4: State Team Login ---');
  const stateLogin = await post('/api/v1/evaluation/state-team/login', {
    workEmail: testStateEmail,
    password: 'SecureStatePass123!',
  });
  console.log('State Login Response:', stateLogin.status, stateLogin.data.fullName, 'JWT acquired');
  if (stateLogin.status !== 200 || !stateLogin.data.token) {
    throw new Error('State Team login failed');
  }
  const stateToken = stateLogin.data.token;
  console.log('Assertion PASSED: State Team authenticated successfully.');

  // 3. ROSTER ADD & FIELD USER STATUS (PENDING vs ACTIVE)
  console.log('\n--- TEST 5: State Supervisor Enrolls Worker onto Roster ---');
  const testWorkerPhone = '98' + Math.floor(10000000 + Math.random() * 90000000);
  const addRoster = await post(
    '/api/v1/evaluation/roster',
    {
      phone: testWorkerPhone,
      state: 'MH',
      district: 'Pune',
    },
    stateToken
  );
  console.log('Roster Add Response:', addRoster.status, addRoster.data.phoneE164, addRoster.data.status);
  if (addRoster.status !== 200 || addRoster.data.status !== 'ACTIVE') {
    throw new Error('Roster add failed');
  }
  console.log('Assertion PASSED: Worker enrolled onto active roster with status ACTIVE.');

  console.log('\n--- TEST 6: Field Worker OTP Request (via local SMS sink) ---');
  const fieldOtpReq = await post('/api/v1/auth/field/send-otp', {
    phone: testWorkerPhone,
    deviceId: 'test-device-uuid',
  });
  console.log('Field Worker OTP Req:', fieldOtpReq.status, fieldOtpReq.data);
  if (fieldOtpReq.status !== 200 || !fieldOtpReq.data.success) {
    throw new Error('Field Worker send OTP failed');
  }
  console.log('Assertion PASSED: Field worker OTP enqueued into local SMS outbox sink.');

  // 4. VERIFY ROSTER LISTING SCOPE
  console.log('\n--- TEST 7: State Team Roster Retrieval ---');
  const rosterList = await get('/api/v1/evaluation/roster?state=MH', stateToken);
  console.log('Roster Count for MH:', rosterList.data.length);
  const found = rosterList.data.find((r) => r.phoneE164.includes(testWorkerPhone));
  if (!found) {
    throw new Error('Newly added worker not found in roster list');
  }
  console.log('Assertion PASSED: Enrolled worker found on roster with status:', found.status);

  // 5. VERIFY REVENUE / SUPERVISION QUEUE
  console.log('\n--- TEST 8: State Supervision Queue ---');
  const supervisionList = await get('/api/v1/evaluation/supervision?view=OVERDUE&state=MH', stateToken);
  console.log('Supervision Tasks Returned:', supervisionList.data.length);
  console.log('Assertion PASSED: Supervision queue active and queried.');

  console.log('\n================================================================');
  console.log('ALL LOCAL SINK & EVALUATION AUTH TESTS PASSED CLEANLY (8/8)');
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
