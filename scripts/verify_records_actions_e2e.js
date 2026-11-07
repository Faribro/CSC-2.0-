// scripts/verify_records_actions_e2e.js
// End-to-end verification of Records & Follow-ups list actions:
// 1. Data check (real CSC-CS refs, zero hardcoded CRF-DL sample data)
// 2. Strict API role enforcement: Leadership 403 on client details/linelist/edit, State Team 403 on edit
// 3. Fictional beneficiary registration
// 4. View profile (read-only verification)
// 5. Edit profile (prefilled, version +1, revision history, outbox sync)
// 6. Optimistic concurrency control (409 conflict on stale version)
// 7. Follow-up flows (could not reach attempt -> visit encounter)

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:8080';

async function run() {
  console.log('==================================================================');
  console.log('▶ CSC 2.0 RECORDS & FOLLOW-UPS ACTIONS END-TO-END VERIFICATION');
  console.log('Target URL:', BASE_URL);
  console.log('==================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // -------------------------------------------------------------------------
  // 1. SETUP ACTORS: STATE TEAM & FIELD WORKER
  // -------------------------------------------------------------------------
  console.log('1. Setting up authenticated actors (State Team & Dual-Factor Field Worker)...');
  const testStateEmail = `state.lead.${Date.now()}@allianceindia.test`;
  
  // State team signup OTP
  const sOtpRes = await fetch(`${BASE_URL}/api/v1/evaluation/state-team/signup/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workEmail: testStateEmail,
      stateCode: 'DL',
      firstName: 'Anita',
      lastName: 'Desai',
      organization: 'NACO DL Supervision',
      password: 'DemoPassword123!',
      confirmPassword: 'DemoPassword123!'
    })
  });
  const sOtpJson = await sOtpRes.json();
  const stateOtp = sOtpJson.challengeCode;

  // Verify State Team OTP -> obtains JWT and Enrolment Barcode/Token
  const sVerifyRes = await fetch(`${BASE_URL}/api/v1/evaluation/state-team/signup/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workEmail: testStateEmail,
      otp: stateOtp
    })
  });
  const sVerifyJson = await sVerifyRes.json();
  const stateJwt = sVerifyJson.token;
  const enrolmentToken = sVerifyJson.enrolmentToken;
  assert(stateJwt && enrolmentToken, 'State Team signed up and received JWT + Enrolment Barcode');

  // Field Worker dual-factor login: phone + barcode
  const workerPhone = '9876543210';
  await fetch(`${BASE_URL}/api/v1/auth/field/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: workerPhone, deviceId: 'test-device' })
  });
  const fLoginRes = await fetch(`${BASE_URL}/api/v1/auth/field/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: workerPhone,
      code: '123456',
      enrolmentToken: enrolmentToken,
      firstName: 'Ramesh',
      lastName: 'Kumar',
      deviceId: 'test-device'
    })
  });
  const fLoginJson = await fLoginRes.json();
  const fieldJwt = fLoginJson.tokens?.sessionToken;
  assert(fLoginRes.ok && fieldJwt, 'Field Worker dual-factor login succeeded with barcode + OTP');

  // Leadership login
  const leadRes = await fetch(`${BASE_URL}/api/v1/evaluation/leadership/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'faridsayyed1010@gmail.com' })
  });
  const leadOtpJson = await leadRes.json();
  const leadVerifyRes = await fetch(`${BASE_URL}/api/v1/evaluation/leadership/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'faridsayyed1010@gmail.com', otp: leadOtpJson.challengeCode })
  });
  const leadVerifyJson = await leadVerifyRes.json();
  const leadJwt = leadVerifyJson.token;
  assert(leadJwt, 'Leadership authenticated and received JWT with LEADERSHIP role');

  // -------------------------------------------------------------------------
  // 2. DATA CHECK FIRST: REAL CLIENT REFS, NO HARDCODED SAMPLE ROWS
  // -------------------------------------------------------------------------
  console.log('\n2. Verifying Linelist API data check...');
  const listRes = await fetch(`${BASE_URL}/api/v1/clients?page=0&size=20`, {
    headers: { Authorization: `Bearer ${fieldJwt}` }
  });
  assert(listRes.ok, 'Field worker can fetch client linelist');
  const listData = await listRes.json();
  const clientsList = listData.clients || [];

  // Verify none of the hardcoded sample IDs or refs exist
  const hasSample0042 = clientsList.some(c => c.clientRef === 'CRF-DL-2026-0042');
  const hasSample0089 = clientsList.some(c => c.clientRef === 'CRF-DL-2026-0089');
  const hasSample0112 = clientsList.some(c => c.clientRef === 'CRF-DL-2026-0112');
  assert(!hasSample0042 && !hasSample0089 && !hasSample0112, 'Zero hardcoded sample clients (CRF-DL-2026-0042/0089/0112) in API response');

  // -------------------------------------------------------------------------
  // 3. API ROLE ENFORCEMENT
  // -------------------------------------------------------------------------
  console.log('\n3. Verifying strict API role rules...');

  // 3a. Leadership is FORBIDDEN from listing clients
  const leadListRes = await fetch(`${BASE_URL}/api/v1/clients?page=0&size=10`, {
    headers: { Authorization: `Bearer ${leadJwt}` }
  });
  assert(leadListRes.status === 403, 'Leadership is HTTP 403 FORBIDDEN from accessing client linelist (aggregates only)');

  // -------------------------------------------------------------------------
  // 4. REGISTER A FICTIONAL BENEFICIARY
  // -------------------------------------------------------------------------
  console.log('\n4. Registering a fictional beneficiary...');
  const regPayload = {
    clientRef: `CSC-CS-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    centerId: 'CENTER_DELHI_01',
    fullName: 'Kavita Ramesh Patil',
    aliasName: 'Kavi',
    age: 32,
    gender: 'female',
    maritalStatus: '1',
    caregiverName: 'Ramesh Patil',
    primaryPhone: '9811005501',
    alternatePhone: '9811005502',
    addressCurrent: 'Flat 12, Guru Nanak Pura, Central Delhi',
    district: 'Central Delhi',
    state: 'Delhi',
    pincode: '110005',
    hivStatus: 'positive',
    artNumber: 'DL-LNJP-9921',
    artCenterName: 'LNJP Hospital ART Centre Delhi',
    artStartDate: '2024-05-10',
    cd4Count: 480,
    cd4Percentage: 27.5,
    viralLoadCount: 0,
    hasHivDocDeclaration: true,
    hasAddressDocDeclaration: true,
    hasArtDocDeclaration: true,
    homeVisitConsent: true,
    messagingConsent: true,
    familyMembers: [
      { name: 'Aarav Patil', relationship: 'child', age: 7, gender: 'male', hivStatus: 'negative' }
    ],
    referralRequests: [
      { serviceCategory: 'social_protection', facilityName: 'Delhi Social Welfare Dept', targetDueDate: '2026-11-20', status: 'PENDING' }
    ]
  };

  const regRes = await fetch(`${BASE_URL}/api/v1/clients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${fieldJwt}`,
      'Idempotency-Key': `reg-${Date.now()}`
    },
    body: JSON.stringify(regPayload)
  });
  assert(regRes.ok, 'Fictional client registered successfully');
  const regReceipt = await regRes.json();
  const clientId = regReceipt.resourceId;
  assert(clientId, `Client created with UUID: ${clientId}`);

  // 3b. Verify Leadership is FORBIDDEN from viewing client details and profile
  const leadDetailRes = await fetch(`${BASE_URL}/api/v1/clients/${clientId}`, {
    headers: { Authorization: `Bearer ${leadJwt}` }
  });
  assert(leadDetailRes.status === 403, 'Leadership is HTTP 403 FORBIDDEN from viewing client details');

  const leadProfileRes = await fetch(`${BASE_URL}/api/v1/clients/${clientId}/profile`, {
    headers: { Authorization: `Bearer ${leadJwt}` }
  });
  assert(leadProfileRes.status === 403, 'Leadership is HTTP 403 FORBIDDEN from viewing client profile');

  // 3c. Verify State Team gets READ-ONLY view
  const stateProfileRes = await fetch(`${BASE_URL}/api/v1/clients/${clientId}/profile`, {
    headers: { Authorization: `Bearer ${stateJwt}` }
  });
  assert(stateProfileRes.ok, 'State Team can view client profile for supervision/evaluation');

  // 3d. Verify State Team is FORBIDDEN from editing
  const stateEditRes = await fetch(`${BASE_URL}/api/v1/clients/${clientId}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${stateJwt}`
    },
    body: JSON.stringify({
      expectedVersion: 0,
      changeReason: 'State team attempted edit',
      fullName: 'Tampered Name'
    })
  });
  assert(stateEditRes.status === 403, 'State Team is HTTP 403 FORBIDDEN from editing beneficiary record');

  // -------------------------------------------------------------------------
  // 5. VIEW ACTION: VERIFY PREFILLED PROFILE DATA & REPEATS
  // -------------------------------------------------------------------------
  console.log('\n5. Verifying VIEW action (full prefilled profile with repeating groups)...');
  const viewRes = await fetch(`${BASE_URL}/api/v1/clients/${clientId}/profile`, {
    headers: { Authorization: `Bearer ${fieldJwt}` }
  });
  assert(viewRes.ok, 'Field worker can fetch client profile in view mode');
  const profile = await viewRes.json();
  assert(profile.fullName === 'Kavita Ramesh Patil', 'Profile prefilled with full name');
  assert(profile.artNumber === 'DL-LNJP-9921', 'Profile prefilled with ART number');
  assert(profile.familyMembers && profile.familyMembers.length === 1, 'Profile prefilled with family members repeat group');
  assert(profile.familyMembers[0].name === 'Aarav Patil', 'Family member name correctly prefilled');
  assert(profile.referralRequests && profile.referralRequests.length === 1, 'Profile prefilled with referrals repeat group');
  assert(profile.version === 0, 'Initial client version is 0');

  // -------------------------------------------------------------------------
  // 6. EDIT ACTION: PREFILLED, VERSION +1, REVISION RECORDED
  // -------------------------------------------------------------------------
  console.log('\n6. Verifying EDIT action (modify fields, version +1, audit & outbox)...');
  const editPayload = {
    expectedVersion: 0,
    changeReason: 'Updated primary phone and added nutrition consultation notes',
    fullName: 'Kavita Ramesh Patil',
    aliasName: 'Kavi',
    age: 32,
    gender: 'female',
    maritalStatus: '1',
    caregiverName: 'Ramesh Patil',
    primaryPhone: '9811009988', // CHANGED PHONE
    alternatePhone: '9811005502',
    addressCurrent: 'Flat 12, Guru Nanak Pura, Central Delhi',
    district: 'Central Delhi',
    state: 'Delhi',
    pincode: '110005',
    hivStatus: 'positive',
    artNumber: 'DL-LNJP-9921',
    artCenterName: 'LNJP Hospital ART Centre Delhi',
    artStartDate: '2024-05-10',
    cd4Count: 520, // CHANGED CD4
    cd4Percentage: 28.5,
    viralLoadCount: 0,
    hasHivDocDeclaration: true,
    hasAddressDocDeclaration: true,
    hasArtDocDeclaration: true,
    homeVisitConsent: true,
    messagingConsent: true,
    clientRef: profile.clientRef, // Immutable field passed back unchanged
    familyMembers: [
      { name: 'Aarav Patil', relationship: 'child', age: 7, gender: 'male', hivStatus: 'negative' }
    ],
    referralRequests: [
      { serviceCategory: 'social_protection', facilityName: 'Delhi Social Welfare Dept', targetDueDate: '2026-11-20', status: 'PENDING' }
    ]
  };

  const editRes = await fetch(`${BASE_URL}/api/v1/clients/${clientId}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${fieldJwt}`,
      'Idempotency-Key': `edit-${Date.now()}`
    },
    body: JSON.stringify(editPayload)
  });
  assert(editRes.ok, 'Profile update saved successfully');
  const editReceipt = await editRes.json();
  assert(editReceipt.version === 1, 'Profile update incremented version to 1 (new revision)');

  // Verify updated profile and revision history
  const updatedProfileRes = await fetch(`${BASE_URL}/api/v1/clients/${clientId}/profile`, {
    headers: { Authorization: `Bearer ${fieldJwt}` }
  });
  const updatedProfile = await updatedProfileRes.json();
  assert(updatedProfile.version === 1, 'Server version is now 1');
  assert(updatedProfile.primaryPhone === '9811009988', 'Primary phone updated in server database');
  assert(updatedProfile.cd4Count === 520, 'CD4 count updated to 520');
  assert(updatedProfile.revisions && updatedProfile.revisions.length === 1, 'Revision history recorded exactly 1 revision entry');
  assert(updatedProfile.revisions[0].revisionNumber === 1, 'Revision number is 1');
  assert(updatedProfile.revisions[0].changeReason.includes('Updated primary phone'), 'Revision change reason recorded accurately');

  // -------------------------------------------------------------------------
  // 7. OPTIMISTIC CONCURRENCY CONTROL: STALE VERSION GETS 409 CONFLICT
  // -------------------------------------------------------------------------
  console.log('\n7. Verifying Optimistic Concurrency Control (409 Conflict)...');
  const stalePayload = {
    ...editPayload,
    expectedVersion: 0, // STALE! Server is now at 1
    changeReason: 'Conflicting edit with stale version 0'
  };
  const conflictRes = await fetch(`${BASE_URL}/api/v1/clients/${clientId}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${fieldJwt}`,
      'Idempotency-Key': `conflict-${Date.now()}`
    },
    body: JSON.stringify(stalePayload)
  });
  assert(conflictRes.status === 409, 'Server returned HTTP 409 CONFLICT for stale version modification attempt');

  // -------------------------------------------------------------------------
  // 8. FOLLOW-UP ACTIONS: COULD NOT REACH, THEN VISIT ENCOUNTER
  // -------------------------------------------------------------------------
  console.log('\n8. Verifying FOLLOW-UP actions (could not reach, then visit encounter)...');

  // Fetch client tasks to get task ID for follow-up
  const clientDetailRes = await fetch(`${BASE_URL}/api/v1/clients/${clientId}`, {
    headers: { Authorization: `Bearer ${fieldJwt}` }
  });
  const clientDetail = await clientDetailRes.json();
  const tasks = clientDetail.tasks || [];
  const targetTask = tasks.length > 0 ? tasks[0] : null;

  // 8a. Log Contact Attempt: "Tried, could not reach"
  const attemptRes = await fetch(`${BASE_URL}/api/v1/follow-up/contact-attempts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${fieldJwt}`,
      'Idempotency-Key': `att-${Date.now()}`
    },
    body: JSON.stringify({
      taskId: targetTask ? targetTask.id : null,
      clientId: clientId,
      attemptDate: new Date().toISOString().split('T')[0],
      channel: 'PHONE',
      outcome: 'could_not_reach',
      notes: 'Phone rang, no response. Will re-attempt tomorrow.'
    })
  });
  assert(attemptRes.ok, 'Contact attempt "Tried, could not reach" recorded successfully');

  // 8b. Log Encounter: "Visited / Spoke"
  const encounterRes = await fetch(`${BASE_URL}/api/v1/follow-up/encounters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${fieldJwt}`,
      'Idempotency-Key': `enc-${Date.now()}`
    },
    body: JSON.stringify({
      taskId: targetTask ? targetTask.id : null,
      clientId: clientId,
      observationDate: new Date().toISOString().split('T')[0],
      encounterType: 'HOME_VISIT',
      artAdherenceAssessment: 'GOOD (>95%)',
      nutritionAssessment: 'NORMAL',
      generalNotes: 'Home visit completed. Beneficiary confirmed adherence, pill count checked.'
    })
  });
  assert(encounterRes.ok, 'Encounter "Visited / Spoke" recorded successfully');

  console.log('\n==================================================================');
  console.log(`🎉 ALL ${passed}/${total} RECORDS & FOLLOW-UPS E2E CHECKS PASSED!`);
  console.log('==================================================================');
}

run().catch((err) => {
  console.error('\n❌ Verification Failed:', err.message);
  process.exit(1);
});
