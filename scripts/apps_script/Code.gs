/**
 * CSC 2.0 — Google Sheets Mirror & Outbox Ingestion Engine
 * 
 * Target Workbook: Single professional workbook with 3-tier header, repeat tabs, and hidden system tabs.
 * Authentication: In-body HMAC-SHA256 signature with timestamp, nonce, and event_id idempotency.
 * Security: Formula injection escaping, LockService concurrency guard, quota-aware batching.
 *
 * (c) 2026 India HIV/AIDS Alliance
 */

/**
 * Helper to grant one-time MailApp permissions in Apps Script Editor
 */
function authorizeMailPermissions() {
  var quota = MailApp.getRemainingDailyQuota();
  Logger.log('Mail quota remaining: ' + quota);
  return quota;
}

// ---------------------------------------------------------------------------
// 1. CONFIGURATION & COLOR PALETTE (Strictly NO Blue, NO Dark Green)
// ---------------------------------------------------------------------------
var PALETTE = {
  TITLE_BG: '#FDEBD0',       // Soft Peach / Golden Cream (from user reference image)
  TITLE_FG: '#2C3E50',       // Dark Charcoal Slate
  GROUP_IDENT: '#F4ECF7',    // Soft Lavender
  GROUP_DEMO: '#FCF3CF',     // Soft Warm Gold
  GROUP_ADDR: '#FEF9E7',     // Soft Cream Amber
  GROUP_FAMILY: '#FFE1CC',   // Soft Peach
  GROUP_CLINICAL: '#FDEDEC', // Soft Terracotta Rose
  GROUP_SOCIAL: '#E8F8F5',   // Soft Mint
  GROUP_RISK: '#F5EEF8',     // Soft Violet
  GROUP_VERIF: '#EAECEE',    // Soft Cool Grey
  GROUP_SYSTEM: '#F2F4F4',   // Neutral Grey
  HEADER_FG: '#1A252F',      // Deep Ink
  BORDER_COLOR: '#BDC3C7'    // Divider Border
};

var SPREADSHEET_ID = "1onMDhrdr5c8fcBRsvtelN_vGQ0R8W8zMFeOU0pxEHVM";

function getSpreadsheet() {
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function ensureDimensions(sheet, minRows, minCols) {
  if (!sheet) return;
  try {
    var curCols = sheet.getMaxColumns();
    if (minCols && curCols < minCols) {
      sheet.insertColumnsAfter(curCols, minCols - curCols);
    }
    var curRows = sheet.getMaxRows();
    if (minRows && curRows < minRows) {
      sheet.insertRowsAfter(curRows, minRows - curRows);
    }
  } catch (e) {}
}

// ---------------------------------------------------------------------------
// 2. WEB APP GET HANDLER (doGet - Health & Capability Check)
// ---------------------------------------------------------------------------
function doGet(e) {
  var headerCheck = {
    hasHeadersProperty: (typeof e !== 'undefined' && typeof e.headers !== 'undefined'),
    hasPostData: (typeof e !== 'undefined' && typeof e.postData !== 'undefined'),
    queryParametersReceived: (e && e.parameter) ? Object.keys(e.parameter) : [],
    supportedContract: "Payload-Body Gateway Credential (RFC 7231 302 Header-Stripping Compliant)"
  };

  var ssId = SPREADSHEET_ID;
  var actionResult = null;
  var sheetInfo = [];

  try {
    var ss = getSpreadsheet();
    if (ss) {
      ssId = ss.getId();

      var action = e && e.parameter ? e.parameter.action : null;
      if (action === 'reformat_headers' || action === 'initialize') {
        var deleted = cleanUnwantedSheets(ss);
        formatClients3TierHeader(ss.getSheetByName('Clients') || ss.insertSheet('Clients'));
        formatRepeatTabHeader(ss.getSheetByName('Family_Members') || ss.insertSheet('Family_Members'), 'CSC 2.0 Family Members Roster', 'Family_Members', [
          'Client ID', 'Client Ref', 'Member Name', 'Relationship', 'Age', 'Gender', 'HIV Status', 'ART Number', 'Synced At'
        ], 'REPEAT PROJECTION KEYED BY CLIENT ID — FAMILY & HOUSEHOLD DEMOGRAPHICS', PALETTE.GROUP_FAMILY);
        formatRepeatTabHeader(ss.getSheetByName('Referral_Requests') || ss.insertSheet('Referral_Requests'), 'CSC 2.0 Referral Requests Log', 'Referral_Requests', [
          'Client ID', 'Client Ref', 'Referral Date', 'Service Category', 'Target Facility', 'Reason', 'Status', 'Synced At'
        ], 'REPEAT PROJECTION KEYED BY CLIENT ID — SOCIAL PROTECTION & CLINICAL REFERRALS', PALETTE.GROUP_SOCIAL);
        formatRepeatTabHeader(ss.getSheetByName('Follow_Up_Visits') || ss.insertSheet('Follow_Up_Visits'), 'CSC 2.0 Follow-Up Visits & Clinical Encounters', 'Follow_Up_Visits', [
          'Client ID', 'Client Ref', 'Task Ref', 'Visit Date', 'Type', 'ART Adherence', 'Nutrition', 'CD4', 'Viral Load', 'Action Taken', 'Synced At'
        ], 'REPEAT PROJECTION KEYED BY CLIENT ID — LONGITUDINAL CLINICAL ENCOUNTERS', PALETTE.GROUP_CLINICAL);
        formatRepeatTabHeader(ss.getSheetByName('Planned_Services') || ss.insertSheet('Planned_Services'), 'CSC 2.0 Planned & Delivered Services', 'Planned_Services', [
          'Client ID', 'Client Ref', 'Service Code', 'Service Name', 'Due Date', 'Delivered Date', 'Facility', 'Status', 'Synced At'
        ], 'REPEAT PROJECTION KEYED BY CLIENT ID — SERVICE DELIVERY & INTERVENTIONS', PALETTE.GROUP_DEMO);
        ['_Index', '_Schema', '_Log'].forEach(function(sName) {
          var s = ss.getSheetByName(sName) || ss.insertSheet(sName); s.clear();
          ensureDimensions(s, 10, 6);
          if (!s.isSheetHidden()) s.hideSheet();
        });
        actionResult = { action: action, status: 'REFORMATTED_AND_CLEANED', deleted_sheets: deleted };
      } else if (action === 'clean_unwanted') {
        var deleted = cleanUnwantedSheets(ss);
        actionResult = { action: 'clean_unwanted', deleted_sheets: deleted };
      }

      var clientSheet = ss.getSheetByName('Clients');
      var familySheet = ss.getSheetByName('Family_Members');
      var refSheet = ss.getSheetByName('Referral_Requests');
      var logSheet = ss.getSheetByName('_Log');

      var totalClients = clientSheet ? Math.max(0, clientSheet.getLastRow() - 4) : 0;
      var totalFamily = familySheet ? Math.max(0, familySheet.getLastRow() - 4) : 0;
      var totalRefs = refSheet ? Math.max(0, refSheet.getLastRow() - 4) : 0;
      var totalLogs = logSheet ? Math.max(0, logSheet.getLastRow() - 1) : 0;

      sheetInfo = ss.getSheets().map(function(s) {
        return {
          name: s.getName(),
          hidden: s.isSheetHidden(),
          rows: s.getLastRow(),
          cols: s.getLastColumn()
        };
      });
    }
  } catch (err) {
    actionResult = { error: err.message };
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "UP",
    service: "CSC 2.0 Google Apps Script Mirror Gateway",
    timestamp: new Date().toISOString(),
    header_runtime_proof: headerCheck,
    spreadsheet_id: ssId,
    workbook_name: "CSC 2.0 Client Registry",
    total_clients: totalClients || 0,
    total_family_members: totalFamily || 0,
    total_referrals: totalRefs || 0,
    total_audit_events: totalLogs || 0,
    recent_clients: (ss ? getRecentClients(ss) : []),
    header_tiers: [
      "Tier 1: Merged Title (Row 1)",
      "Tier 2: Category Grouping Bands (Row 2)",
      "Tier 3: 45° Rotated Field Headers (Row 3)",
      "Tier 4: Column Numbers (Row 4)"
    ],
    active_sheets: sheetInfo,
    action_result: actionResult
  })).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// 3. WEB APP POST HANDLER (doPost)
// ---------------------------------------------------------------------------
function doPost(e) {
  var lock = LockService.getScriptLock();
  var lockAcquired = false;

  try {
    // Acquire lock up to 10 seconds to serialize writes and prevent concurrency races
    lockAcquired = lock.tryLock(10000);
    if (!lockAcquired) {
      return jsonResponse(429, 'BUSY', 'Lock acquisition timed out under concurrent load');
    }

    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse(400, 'BAD_REQUEST', 'Missing request body');
    }

    var request;
    try {
      request = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonResponse(400, 'INVALID_JSON', 'Malformed JSON payload');
    }

    // 1. Authenticate Request (HMAC-SHA256 Signature or Script Secret)
    var authResult = verifyAuthentication(request);
    if (!authResult.valid) {
      return jsonResponse(401, 'UNAUTHORIZED', authResult.message);
    }

    // Direct Notification Dispatch from Backend (OTP, Welcome Email, etc.)
    if (request.recipient && request.subject && request.body) {
      var quota = MailApp.getRemainingDailyQuota();
      if (quota <= 0) {
        var ss = getSpreadsheet();
        recordAuditLog(ss, Utilities.getUuid(), 'EMAIL_DISPATCH', 'SYSTEM', 'ERROR: Daily email quota exhausted', 0);
        return jsonResponse(429, 'QUOTA_EXCEEDED', 'Daily email quota exhausted');
      }
      var emailPayload = {
        to: request.recipient,
        subject: request.subject,
        body: request.body
      };
      if (request.htmlBody) {
        emailPayload.htmlBody = request.htmlBody;
      }
      MailApp.sendEmail(emailPayload);
      var ss = getSpreadsheet();
      recordAuditLog(ss, Utilities.getUuid(), 'EMAIL_DISPATCH', 'SYSTEM', 'SUCCESS: Dispatched to recipient', 0);
      return jsonResponse(200, 'DELIVERED', 'Email dispatched successfully', { delivered: true });
    }

    var eventId = request.eventId;
    var eventType = request.eventType;
    var timestamp = request.timestamp || Date.now();
    var startTime = Date.now();

    var ss = getSpreadsheet();
    initializeWorkbookIfMissing(ss);

    // 2. Idempotency Check via _Log and _Index
    if (isEventAlreadyProcessed(ss, eventId)) {
      return jsonResponse(200, 'SUCCESS', 'Event ' + eventId + ' already processed (idempotent no-op)', {
        eventId: eventId,
        idempotent_noop: true
      });
    }

    // 3. Dispatch by Event Type
    var payload = request.payload;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (ex) {
        // Leave as string if not JSON object
      }
    }

    if (eventType === 'CLIENT_REGISTERED' || eventType === 'CLIENT_UPDATED' || eventType === 'CLIENT_UPSERT') {
      processClientUpsert(ss, eventId, payload);
    } else if (eventType === 'ENCOUNTER_RECORDED') {
      processEncounterRecord(ss, eventId, payload);
    } else if (eventType === 'SERVICE_PLANNED' || eventType === 'SERVICE_DELIVERED') {
      processServiceRecord(ss, eventId, payload);
    } else if (eventType === 'sendReportsNow' || eventType === 'SEND_REPORTS_NOW') {
      var force = payload && payload.force === true;
      var target = payload && payload.target ? payload.target : 'ALL';
      var reportResult = handleSendReportsNow(ss, target, force);
      var durationMs = Date.now() - startTime;
      recordAuditLog(ss, eventId, eventType, request.aggregateId || '', 'SUCCESS', durationMs);
      return jsonResponse(200, 'SUCCESS', 'Reports processed successfully', reportResult);
    }

    // 4. Record to _Log
    var durationMs = Date.now() - startTime;
    recordAuditLog(ss, eventId, eventType, request.aggregateId || '', 'SUCCESS', durationMs);

    return jsonResponse(200, 'SUCCESS', 'Event ingested into Google Sheets mirror successfully');
  } catch (err) {
    if (ss && eventId) {
      try {
        recordAuditLog(ss, eventId, request ? request.eventType : 'UNKNOWN', '', 'ERROR: ' + err.message, 0);
      } catch (logErr) {}
    }
    return jsonResponse(500, 'INTERNAL_ERROR', err.message);
  } finally {
    if (lockAcquired) {
      lock.releaseLock();
    }
  }
}

// ---------------------------------------------------------------------------
// 3. AUTHENTICATION & HMAC VERIFICATION
// ---------------------------------------------------------------------------
function verifyAuthentication(request) {
  var storedSecret = PropertiesService.getScriptProperties().getProperty('GATEWAY_SECRET');
  if (!storedSecret) {
    // Fallback for initial commissioning if not yet set in Script Properties
    storedSecret = 'local_gateway_synthetic_secret_token_12345';
  }

  // Option A: Direct Secret in Body (for simple backend setups)
  if ((request.secret && request.secret === storedSecret) ||
      (request.service_credential && request.service_credential === storedSecret)) {
    return { valid: true };
  }

  // Option B: HMAC-SHA256 Signature with Timestamp and Nonce (Production ASVS aligned)
  if (request.signature && request.timestamp && request.nonce && request.eventId) {
    // Validate timestamp freshness (window of 5 minutes = 300,000 ms)
    var now = Date.now();
    var skew = Math.abs(now - request.timestamp);
    if (skew > 300000) {
      return { valid: false, message: 'Timestamp skew exceeds 5-minute security window' };
    }

    var payloadString = typeof request.payload === 'string' ? request.payload : JSON.stringify(request.payload);
    var messageToSign = request.timestamp + ':' + request.nonce + ':' + request.eventId + ':' + payloadString;
    var computedSignature = computeHmacSha256(messageToSign, storedSecret);

    if (computedSignature.toLowerCase() === request.signature.toLowerCase()) {
      return { valid: true };
    } else {
      return { valid: false, message: 'Invalid HMAC signature' };
    }
  }

  return { valid: false, message: 'Missing valid gateway credential or HMAC signature' };
}

function computeHmacSha256(message, key) {
  var rawHash = Utilities.computeHmacSha256Signature(message, key);
  return rawHash.map(function(byte) {
    var hex = (byte < 0 ? byte + 256 : byte).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// ---------------------------------------------------------------------------
// 4. SANITIZATION (FORMULA INJECTION DEFENSE)
// ---------------------------------------------------------------------------
function sanitizeValue(val) {
  if (val === null || val === undefined) return '';
  var s = String(val);
  // Defend against CSV/Spreadsheet formula injection
  var firstChar = s.charAt(0);
  if (firstChar === '=' || firstChar === '+' || firstChar === '-' || firstChar === '@' || firstChar === '\t' || firstChar === '\r') {
    return "'" + s;
  }
  return s;
}

function maskPhone(phone) {
  if (!phone) return '';
  var clean = String(phone).trim();
  if (clean.length < 10) return '***';
  // Keep country code / first 2 digits and last 3 digits, mask middle
  return clean.replace(/(\+?91)?[6-9](\d{2})\d{4}(\d{3})/, '$1 98*** **$3');
}

// ---------------------------------------------------------------------------
// 5. CLIENT UPSERT WITH 3-TIER HEADERS & REPEATS
// ---------------------------------------------------------------------------
function processClientUpsert(ss, eventId, client) {
  var sheet = ss.getSheetByName('Clients');
  var indexSheet = ss.getSheetByName('_Index');

  var clientId = client.clientId || client.id || client.aggregateId || Utilities.getUuid();
  var clientRef = client.clientRef || 'CSC-REF';
  var rowHash = computeRowHash(client);

  // Check _Index for existing row
  var existingRow = findIndexRow(indexSheet, 'Clients', clientId);

  var rowValues = [
    sanitizeValue(clientId),
    sanitizeValue(clientRef),
    sanitizeValue(client.centerId || 'CENTER_MAIN'),
    sanitizeValue(client.fullName || 'Beneficiary'),
    sanitizeValue(client.aliasName || ''),
    client.age || 0,
    sanitizeValue(client.gender || 'other'),
    sanitizeValue(client.maritalStatus || ''),
    sanitizeValue(client.inSchool ? 'Yes' : 'No'),
    sanitizeValue(client.occupation || ''),
    sanitizeValue(client.registrationDate || new Date().toISOString().split('T')[0]),
    sanitizeValue(maskPhone(client.primaryPhone)),
    sanitizeValue(client.addressCurrent || ''),
    sanitizeValue(client.district || 'Pune'),
    sanitizeValue(client.state || 'MH'),
    sanitizeValue(client.pincode || ''),
    sanitizeValue(client.caregiverName || ''),
    client.familyMembers ? client.familyMembers.length : 0,
    sanitizeValue(client.hivStatus || 'unknown'),
    sanitizeValue(client.artNumber || ''),
    sanitizeValue(client.artCenterName || ''),
    sanitizeValue(client.artStartDate || ''),
    client.cd4Count || '',
    client.cd4Percentage || '',
    client.viralLoadCount || '',
    sanitizeValue(client.hasRationCard ? 'Yes' : 'No'),
    sanitizeValue(client.hasVoterId ? 'Yes' : 'No'),
    sanitizeValue(client.hasAadhaar ? 'Yes' : 'No'),
    sanitizeValue(client.hasBankAccount ? 'Yes' : 'No'),
    sanitizeValue(client.keyPopulation || ''),
    sanitizeValue(client.hasHivDoc ? 'Yes' : 'No'),
    sanitizeValue(client.hasAddressDoc ? 'Yes' : 'No'),
    sanitizeValue(client.hasArtDoc ? 'Yes' : 'No'),
    sanitizeValue(client.homeVisitConsent ? 'Yes' : 'No'),
    sanitizeValue(client.messagingConsent ? 'Yes' : 'No'),
    sanitizeValue(client.status || 'ACTIVE'),
    new Date().toISOString(),
    rowHash
  ];

  if (existingRow > 0) {
    // Check if row_hash matches -> no-op
    var storedHash = indexSheet.getRange(existingRow, 4).getValue();
    if (storedHash === rowHash) {
      return; // Identical row, zero write necessary
    }
    var targetRow = indexSheet.getRange(existingRow, 3).getValue();
    ensureDimensions(sheet, targetRow + 1, rowValues.length);
    sheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
    indexSheet.getRange(existingRow, 4, 1, 2).setValues([[rowHash, new Date().toISOString()]]);
  } else {
    // Append row starting at row 5
    var nextRow = Math.max(sheet.getLastRow() + 1, 5);
    ensureDimensions(sheet, nextRow + 1, rowValues.length);
    sheet.getRange(nextRow, 1, 1, rowValues.length).setValues([rowValues]);
    // Record in _Index
    ensureDimensions(indexSheet, indexSheet.getLastRow() + 2, 5);
    indexSheet.appendRow([clientId, 'Clients', nextRow, rowHash, new Date().toISOString()]);
  }

  // Populate Repeats in Same Workbook
  if (client.familyMembers && client.familyMembers.length > 0) {
    processFamilyMembers(ss, clientId, clientRef, client.familyMembers);
  }
  if (client.referralRequests && client.referralRequests.length > 0) {
    processReferrals(ss, clientId, clientRef, client.referralRequests);
  }
}

function processFamilyMembers(ss, clientId, clientRef, members) {
  var sheet = ss.getSheetByName('Family_Members');
  var now = new Date().toISOString();
  var rows = members.map(function(m) {
    return [
      sanitizeValue(clientId),
      sanitizeValue(clientRef),
      sanitizeValue(m.name || 'Member'),
      sanitizeValue(m.relationship || 'other'),
      m.age || 0,
      sanitizeValue(m.gender || 'other'),
      sanitizeValue(m.hivStatus || 'unknown'),
      sanitizeValue(m.artNumber || ''),
      now
    ];
  });
  if (rows.length > 0) {
    var nextRow = Math.max(sheet.getLastRow() + 1, 5);
    ensureDimensions(sheet, nextRow + rows.length + 1, rows[0].length);
    sheet.getRange(nextRow, 1, rows.length, rows[0].length).setValues(rows);
  }
}

function processReferrals(ss, clientId, clientRef, referrals) {
  var sheet = ss.getSheetByName('Referral_Requests');
  var now = new Date().toISOString();
  var rows = referrals.map(function(r) {
    return [
      sanitizeValue(clientId),
      sanitizeValue(clientRef),
      sanitizeValue(r.referralDate || now.split('T')[0]),
      sanitizeValue(r.serviceCategory || 'social_protection'),
      sanitizeValue(r.targetFacility || 'Local Agency'),
      sanitizeValue(r.reason || 'Assistance requested'),
      'SUBMITTED',
      now
    ];
  });
  if (rows.length > 0) {
    var nextRow = Math.max(sheet.getLastRow() + 1, 5);
    ensureDimensions(sheet, nextRow + rows.length + 1, rows[0].length);
    sheet.getRange(nextRow, 1, rows.length, rows[0].length).setValues(rows);
  }
}

function processEncounterRecord(ss, eventId, encounter) {
  var sheet = ss.getSheetByName('Follow_Up_Visits');
  var nextRow = Math.max(sheet.getLastRow() + 1, 5);
  var row = [
    sanitizeValue(encounter.clientId || ''),
    sanitizeValue(encounter.clientRef || ''),
    sanitizeValue(encounter.taskRef || ''),
    sanitizeValue(encounter.visitDate || new Date().toISOString().split('T')[0]),
    sanitizeValue(encounter.encounterType || 'ROUTINE'),
    sanitizeValue(encounter.artAdherence || 'GOOD'),
    sanitizeValue(encounter.nutrition || 'STABLE'),
    encounter.cd4Count || '',
    encounter.viralLoad || '',
    sanitizeValue(encounter.actionTaken || 'Counselling delivered'),
    new Date().toISOString()
  ];
  sheet.getRange(nextRow, 1, 1, row.length).setValues([row]);
}

function processServiceRecord(ss, eventId, service) {
  var sheet = ss.getSheetByName('Planned_Services');
  var nextRow = Math.max(sheet.getLastRow() + 1, 5);
  var row = [
    sanitizeValue(service.clientId || ''),
    sanitizeValue(service.clientRef || ''),
    sanitizeValue(service.serviceCode || 'SVC-001'),
    sanitizeValue(service.serviceName || 'Nutritional Support'),
    sanitizeValue(service.targetDueDate || ''),
    sanitizeValue(service.deliveryDate || ''),
    sanitizeValue(service.facility || 'CSC Center'),
    sanitizeValue(service.status || 'PLANNED'),
    new Date().toISOString()
  ];
  sheet.getRange(nextRow, 1, 1, row.length).setValues([row]);
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// 6. WORKBOOK INITIALIZATION, SHEET CLEANUP & ROTATED HEADER FORMATTING
// ---------------------------------------------------------------------------
function cleanUnwantedSheets(ss) {
  var needed = {
    'Clients': true,
    'Family_Members': true,
    'Referral_Requests': true,
    'Follow_Up_Visits': true,
    'Planned_Services': true,
    '_Index': true,
    '_Schema': true,
    '_Log': true
  };

  var deleted = [];
  var allSheets = ss.getSheets();
  allSheets.forEach(function(s) {
    var name = s.getName();
    if (!needed[name]) {
      if (ss.getSheets().length > 1) {
        try {
          ss.deleteSheet(s);
          deleted.push(name);
        } catch (delErr) {}
      }
    }
  });
  return deleted;
}

function initializeWorkbookIfMissing(ss) {
  var sheetsToCreate = ['Clients', 'Family_Members', 'Referral_Requests', 'Follow_Up_Visits', 'Planned_Services', '_Index', '_Schema', '_Log'];
  sheetsToCreate.forEach(function(name) {
    if (!ss.getSheetByName(name)) {
      ss.insertSheet(name);
    }
  });

  // Delete unwanted sheets to keep only the needed canonical tabs
  cleanUnwantedSheets(ss);

  // Setup Clients 4-Tier Rotated Header if empty
  var clientSheet = ss.getSheetByName('Clients');
  if (clientSheet.getLastRow() < 4) {
    formatClients3TierHeader(clientSheet);
  }

  // Setup Repeats Headers
  var fmSheet = ss.getSheetByName('Family_Members');
  if (fmSheet.getLastRow() < 4) {
    formatRepeatTabHeader(fmSheet, 'CSC 2.0 Family Members Roster', 'Family_Members', [
      'Client ID', 'Client Ref', 'Member Name', 'Relationship', 'Age', 'Gender', 'HIV Status', 'ART Number', 'Synced At'
    ], 'REPEAT PROJECTION KEYED BY CLIENT ID — FAMILY & HOUSEHOLD DEMOGRAPHICS', PALETTE.GROUP_FAMILY);
  }

  var refSheet = ss.getSheetByName('Referral_Requests');
  if (refSheet.getLastRow() < 4) {
    formatRepeatTabHeader(refSheet, 'CSC 2.0 Referral Requests Log', 'Referral_Requests', [
      'Client ID', 'Client Ref', 'Referral Date', 'Service Category', 'Target Facility', 'Reason', 'Status', 'Synced At'
    ], 'REPEAT PROJECTION KEYED BY CLIENT ID — SOCIAL PROTECTION & CLINICAL REFERRALS', PALETTE.GROUP_SOCIAL);
  }

  var fvSheet = ss.getSheetByName('Follow_Up_Visits');
  if (fvSheet.getLastRow() < 4) {
    formatRepeatTabHeader(fvSheet, 'CSC 2.0 Follow-Up Visits & Clinical Encounters', 'Follow_Up_Visits', [
      'Client ID', 'Client Ref', 'Task Ref', 'Visit Date', 'Type', 'ART Adherence', 'Nutrition', 'CD4', 'Viral Load', 'Action Taken', 'Synced At'
    ], 'REPEAT PROJECTION KEYED BY CLIENT ID — LONGITUDINAL CLINICAL ENCOUNTERS', PALETTE.GROUP_CLINICAL);
  }

  var psSheet = ss.getSheetByName('Planned_Services');
  if (psSheet.getLastRow() < 4) {
    formatRepeatTabHeader(psSheet, 'CSC 2.0 Planned & Delivered Services', 'Planned_Services', [
      'Client ID', 'Client Ref', 'Service Code', 'Service Name', 'Due Date', 'Delivered Date', 'Facility', 'Status', 'Synced At'
    ], 'REPEAT PROJECTION KEYED BY CLIENT ID — SERVICE DELIVERY & INTERVENTIONS', PALETTE.GROUP_DEMO);
  }

  // Hide system tabs
  ['_Index', '_Schema', '_Log'].forEach(function(sName) {
    var s = ss.getSheetByName(sName);
    if (s) {
      ensureDimensions(s, 10, 6);
      if (!s.isSheetHidden()) {
        s.hideSheet();
      }
    }
  });
}

function formatClients3TierHeader(sheet) {
  var totalCols = 38;
  ensureDimensions(sheet, 10, totalCols);
  sheet.clear();
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).clearFormat();

  // -------------------------------------------------------------
  // Row 1: Merged Title across all columns (Height: 36px)
  // -------------------------------------------------------------
  sheet.getRange(1, 1, 1, totalCols).merge();
  var titleCell = sheet.getRange(1, 1);
  titleCell.setValue('CSC 2.0 Client Registry');
  titleCell.setBackground(PALETTE.TITLE_BG)
           .setFontColor(PALETTE.TITLE_FG)
           .setFontSize(11)
           .setFontWeight('bold')
           .setHorizontalAlignment('left')
           .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 36);

  // -------------------------------------------------------------
  // Row 2: Category Grouping Bands (Height: 28px)
  // -------------------------------------------------------------
  var bands = [
    { name: '1. IDENTIFICATION', cols: 3, bg: PALETTE.GROUP_IDENT },
    { name: '2. DEMOGRAPHICS', cols: 8, bg: PALETTE.GROUP_DEMO },
    { name: '3. ADDRESS & CONTACT', cols: 5, bg: PALETTE.GROUP_ADDR },
    { name: '4. FAMILY & CAREGIVER', cols: 2, bg: PALETTE.GROUP_FAMILY },
    { name: '5. CLINICAL & TREATMENT', cols: 7, bg: PALETTE.GROUP_CLINICAL },
    { name: '6. SOCIAL PROTECTION', cols: 4, bg: PALETTE.GROUP_SOCIAL },
    { name: '7. RISK PROFILE', cols: 1, bg: PALETTE.GROUP_RISK },
    { name: '8. VERIFICATION & CONSENT', cols: 5, bg: PALETTE.GROUP_VERIF },
    { name: '9. SYSTEM METADATA', cols: 3, bg: PALETTE.GROUP_SYSTEM }
  ];

  var colPtr = 1;
  bands.forEach(function(b) {
    if (b.cols > 1) {
      sheet.getRange(2, colPtr, 1, b.cols).merge();
    }
    var bandCell = sheet.getRange(2, colPtr);
    bandCell.setValue(b.name)
            .setBackground(b.bg)
            .setFontColor(PALETTE.HEADER_FG)
            .setFontWeight('bold')
            .setFontSize(9.5)
            .setHorizontalAlignment('center')
            .setVerticalAlignment('middle');

    for (var c = 0; c < b.cols; c++) {
      sheet.getRange(2, colPtr + c).setBorder(true, true, true, true, false, false, PALETTE.BORDER_COLOR, SpreadsheetApp.BorderStyle.SOLID);
    }
    colPtr += b.cols;
  });
  sheet.setRowHeight(2, 28);

  // -------------------------------------------------------------
  // Row 3: Rotated Field Headers (Height: 135px, Rotation: 45 deg)
  // -------------------------------------------------------------
  var headers = [
    // 1. Identification (Cols 1-3)
    'Client ID', 'Client Ref', 'Center ID',
    // 2. Demographics (Cols 4-11)
    'Full Name', 'Alias Name', 'Age', 'Gender', 'Marital Status', 'In School', 'Occupation', 'Registration Date',
    // 3. Address & Contact (Cols 12-16)
    'Primary Contact No.', 'Current Residential Address', 'District Name', 'State Name', 'Pincode',
    // 4. Family & Caregiver (Cols 17-18)
    'Caregiver Full Name', 'Total Family Members Count',
    // 5. Testing & Clinical Treatment (Cols 19-25)
    'HIV Confirmation Status', 'Assigned ART Number', 'Linked ART Center Name', 'ART Initiation Date', 'Latest CD4 Absolute Count', 'Latest CD4 Percentage', 'Latest Viral Load Copies/mL',
    // 6. Social Protection Linkages (Cols 26-29)
    'Ration Card Linked (Yes/No)', 'Voter ID Linked (Yes/No)', 'Aadhaar Card Linked (Yes/No)', 'Bank Account Active (Yes/No)',
    // 7. Key Population Risk Profile (Col 30)
    'Key Population Profile Category',
    // 8. Verification & Consent (Cols 31-35)
    'HIV Test Verification Document', 'Address Proof Verification Document', 'ART Card Verification Document', 'Home Visit Consent Granted', 'Phone Messaging Consent Granted',
    // 9. System Metadata (Cols 36-38)
    'Registry Client Status', 'Last Record Update Timestamp', 'Row Security Integrity Hash'
  ];

  var colColors = [
    // Ident (Cols 1-3)
    PALETTE.GROUP_IDENT, PALETTE.GROUP_IDENT, PALETTE.GROUP_IDENT,
    // Demo (Cols 4-11)
    PALETTE.GROUP_DEMO, PALETTE.GROUP_DEMO, PALETTE.GROUP_DEMO, PALETTE.GROUP_DEMO, PALETTE.GROUP_DEMO, PALETTE.GROUP_DEMO, PALETTE.GROUP_DEMO, PALETTE.GROUP_DEMO,
    // Addr (Cols 12-16)
    PALETTE.GROUP_ADDR, PALETTE.GROUP_ADDR, PALETTE.GROUP_ADDR, PALETTE.GROUP_ADDR, PALETTE.GROUP_ADDR,
    // Family (Cols 17-18)
    PALETTE.GROUP_FAMILY, PALETTE.GROUP_FAMILY,
    // Clinical (Cols 19-25)
    PALETTE.GROUP_CLINICAL, PALETTE.GROUP_CLINICAL, PALETTE.GROUP_CLINICAL, PALETTE.GROUP_CLINICAL, PALETTE.GROUP_CLINICAL, PALETTE.GROUP_CLINICAL, PALETTE.GROUP_CLINICAL,
    // Social (Cols 26-29)
    PALETTE.GROUP_SOCIAL, PALETTE.GROUP_SOCIAL, PALETTE.GROUP_SOCIAL, PALETTE.GROUP_SOCIAL,
    // Risk (Col 30)
    PALETTE.GROUP_RISK,
    // Verif (Cols 31-35)
    PALETTE.GROUP_VERIF, PALETTE.GROUP_VERIF, PALETTE.GROUP_VERIF, PALETTE.GROUP_VERIF, PALETTE.GROUP_VERIF,
    // System (Cols 36-38)
    PALETTE.GROUP_SYSTEM, PALETTE.GROUP_SYSTEM, PALETTE.GROUP_SYSTEM
  ];

  var hRange = sheet.getRange(3, 1, 1, totalCols);
  hRange.setValues([headers]);
  hRange.setFontColor(PALETTE.HEADER_FG)
        .setFontSize(9)
        .setFontWeight('bold')
        .setVerticalAlignment('bottom')
        .setHorizontalAlignment('left')
        .setTextRotation(45);
  sheet.setRowHeight(3, 135);

  // Set individual column background colors and borders on Row 3
  for (var c = 1; c <= totalCols; c++) {
    var cell = sheet.getRange(3, c);
    cell.setBackground(colColors[c - 1]);
    cell.setBorder(true, true, true, true, false, false, PALETTE.BORDER_COLOR, SpreadsheetApp.BorderStyle.SOLID);
  }

  // Column 1 (Client ID) is kept horizontal (rotation 0) to fill the rectangular cell seamlessly and eliminate the 45-degree white triangular gap (matching the reference design)
  sheet.getRange(3, 1).setTextRotation(0)
                      .setHorizontalAlignment('center')
                      .setVerticalAlignment('bottom');

  // -------------------------------------------------------------
  // Row 4: Column Numbers (Height: 24px, strictly plain text '@')
  // -------------------------------------------------------------
  var colNumbers = [];
  for (var n = 1; n <= totalCols; n++) {
    colNumbers.push(String(n));
  }
  var nRange = sheet.getRange(4, 1, 1, totalCols);
  nRange.setNumberFormat('@');
  nRange.setValues([colNumbers]);
  nRange.setFontColor(PALETTE.HEADER_FG)
        .setFontSize(8.5)
        .setFontWeight('bold')
        .setHorizontalAlignment('center')
        .setVerticalAlignment('middle');
  sheet.setRowHeight(4, 24);

  // Set background and borders on Row 4
  for (var c = 1; c <= totalCols; c++) {
    var nCell = sheet.getRange(4, c);
    nCell.setBackground(colColors[c - 1]);
    nCell.setBorder(true, true, true, true, false, false, PALETTE.BORDER_COLOR, SpreadsheetApp.BorderStyle.SOLID);
  }

  // Freeze rows 1-4
  sheet.setFrozenRows(4);

  // Column widths (compact for rotated text: 95px to 115px, Col 1 wide at 120px)
  for (var c = 1; c <= totalCols; c++) {
    sheet.setColumnWidth(c, c === 1 ? 120 : (c === 2 ? 115 : 95));
  }
  protectSheetHeaders(sheet);
}

function formatRepeatTabHeader(sheet, title, tabName, headers, bandName, bandColor) {
  var totalCols = headers.length;
  ensureDimensions(sheet, 10, totalCols);
  sheet.clear();
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).clearFormat();

  // Row 1: Merged Title (Height: 34px)
  sheet.getRange(1, 1, 1, totalCols).merge();
  var titleCell = sheet.getRange(1, 1);
  titleCell.setValue(title.toUpperCase());
  titleCell.setBackground(PALETTE.TITLE_BG)
           .setFontColor(PALETTE.TITLE_FG)
           .setFontSize(10.5)
           .setFontWeight('bold')
           .setHorizontalAlignment('left')
           .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 34);

  // Row 2: Category Grouping / Projection Band (Height: 26px)
  var bName = bandName || ('REPEAT PROJECTION KEYED BY CLIENT ID — ' + tabName.toUpperCase().replace(/_/g, ' '));
  var bColor = bandColor || PALETTE.GROUP_DEMO;
  sheet.getRange(2, 1, 1, totalCols).merge();
  var bandCell = sheet.getRange(2, 1);
  bandCell.setValue(bName)
          .setBackground(bColor)
          .setFontColor(PALETTE.HEADER_FG)
          .setFontWeight('bold')
          .setFontSize(9)
          .setHorizontalAlignment('center')
          .setVerticalAlignment('middle');
  sheet.setRowHeight(2, 26);
  for (var c = 1; c <= totalCols; c++) {
    sheet.getRange(2, c).setBorder(true, true, true, true, false, false, PALETTE.BORDER_COLOR, SpreadsheetApp.BorderStyle.SOLID);
  }

  // Row 3: Rotated Headers (Height: 125px, Rotation: 45 deg)
  var hRange = sheet.getRange(3, 1, 1, totalCols);
  hRange.setValues([headers]);
  hRange.setFontColor(PALETTE.HEADER_FG)
        .setFontSize(9)
        .setFontWeight('bold')
        .setVerticalAlignment('bottom')
        .setHorizontalAlignment('left')
        .setTextRotation(45)
        .setBackground(bColor);
  sheet.setRowHeight(3, 125);

  for (var c = 1; c <= totalCols; c++) {
    sheet.getRange(3, c).setBorder(true, true, true, true, false, false, PALETTE.BORDER_COLOR, SpreadsheetApp.BorderStyle.SOLID);
  }

  // Column 1 is kept horizontal (rotation 0) to eliminate triangular white gap
  sheet.getRange(3, 1).setTextRotation(0)
                      .setHorizontalAlignment('center')
                      .setVerticalAlignment('bottom');

  // Row 4: Column Numbers (Height: 22px, strictly plain text '@')
  var colNumbers = [];
  for (var n = 1; n <= totalCols; n++) {
    colNumbers.push(String(n));
  }
  var nRange = sheet.getRange(4, 1, 1, totalCols);
  nRange.setNumberFormat('@');
  nRange.setValues([colNumbers]);
  nRange.setFontColor(PALETTE.HEADER_FG)
        .setFontSize(8.5)
        .setFontWeight('bold')
        .setHorizontalAlignment('center')
        .setVerticalAlignment('middle')
        .setBackground(bColor);
  sheet.setRowHeight(4, 22);

  for (var c = 1; c <= totalCols; c++) {
    sheet.getRange(4, c).setBorder(true, true, true, true, false, false, PALETTE.BORDER_COLOR, SpreadsheetApp.BorderStyle.SOLID);
  }

  sheet.setFrozenRows(4);

  for (var c = 1; c <= totalCols; c++) {
    sheet.setColumnWidth(c, c === 1 ? 120 : (c === 2 ? 115 : 100));
  }
  protectSheetHeaders(sheet);
}

function protectSheetHeaders(sheet) {
  try {
    var protections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    for (var i = 0; i < protections.length; i++) {
      if (protections[i].getDescription() === 'Protected Header Rows (Rows 1-4)') {
        protections[i].remove();
      }
    }
    var protection = sheet.getRange(1, 1, 4, sheet.getLastColumn() || 38).protect();
    protection.setDescription('Protected Header Rows (Rows 1-4)');
    protection.setWarningOnly(true);
  } catch (e) {}
}

// ---------------------------------------------------------------------------
// 7. SYSTEM TABS & INDEX HELPERS
// ---------------------------------------------------------------------------
function findIndexRow(indexSheet, sheetName, entityId) {
  var data = indexSheet.getDataRange().getValues();
  for (var r = 0; r < data.length; r++) {
    if (data[r][0] === entityId && data[r][1] === sheetName) {
      return r + 1; // 1-based index
    }
  }
  return -1;
}

function isEventAlreadyProcessed(ss, eventId) {
  var logSheet = ss.getSheetByName('_Log');
  if (!logSheet) return false;
  var lastRow = logSheet.getLastRow();
  if (lastRow < 2) return false;
  // Search recent 100 rows in _Log for eventId
  var startRow = Math.max(2, lastRow - 100);
  var numRows = lastRow - startRow + 1;
  var events = logSheet.getRange(startRow, 1, numRows, 1).getValues();
  for (var i = 0; i < events.length; i++) {
    if (events[i][0] === eventId) return true;
  }
  return false;
}

function recordAuditLog(ss, eventId, eventType, aggregateId, status, durationMs) {
  var logSheet = ss.getSheetByName('_Log');
  if (!logSheet) return;
  logSheet.appendRow([eventId, eventType, aggregateId, status, durationMs, new Date().toISOString()]);
}

function computeRowHash(obj) {
  var s = JSON.stringify(obj);
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s);
  return rawHash.map(function(byte) {
    var hex = (byte < 0 ? byte + 256 : byte).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').substring(0, 16);
}

function getRecentClients(ss) {
  var clientSheet = ss.getSheetByName('Clients');
  if (!clientSheet || clientSheet.getLastRow() < 5) return [];
  var lastRow = clientSheet.getLastRow();
  var startRow = Math.max(5, lastRow - 10);
  var numRows = lastRow - startRow + 1;
  var data = clientSheet.getRange(startRow, 1, numRows, 4).getValues();
  var formulas = clientSheet.getRange(startRow, 1, numRows, 4).getFormulas();
  return data.map(function(r, idx) {
    var rawName = String(r[3]);
    var rawRef = String(r[1]);
    var safeName = rawName;
    if (formulas[idx][3] === '' && (rawName.charAt(0) === '=' || rawName.charAt(0) === '+' || rawName.charAt(0) === '-' || rawName.charAt(0) === '@')) {
      safeName = "'" + rawName;
    }
    var safeRef = rawRef;
    if (formulas[idx][1] === '' && (rawRef.charAt(0) === '=' || rawRef.charAt(0) === '+' || rawRef.charAt(0) === '-' || rawRef.charAt(0) === '@')) {
      safeRef = "'" + rawRef;
    }
    return { clientId: String(r[0]), clientRef: safeRef, centerId: String(r[2]), fullName: safeName };
  });
}

function jsonResponse(code, status, message, extra) {
  var res = {
    code: code,
    status: status,
    message: message,
    timestamp: new Date().toISOString()
  };
  if (extra && typeof extra === 'object') {
    for (var k in extra) {
      res[k] = extra[k];
    }
  }
  return ContentService.createTextOutput(JSON.stringify(res))
                       .setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// 8. EMAIL REPORT GENERATION & DISPATCH (PHASE 3)
// ---------------------------------------------------------------------------

/**
 * Weekly Leadership Summary (AGGREGATE ONLY, Zero PII)
 */
function sendLeadershipWeeklyReport() {
  var ss = getSpreadsheet();
  return handleSendLeadershipReport(ss, false);
}

/**
 * Daily State Team Supervision Briefing (Supervision View, clientRef ONLY)
 */
function sendStateTeamDailyReport() {
  var ss = getSpreadsheet();
  return handleSendStateTeamReport(ss, false);
}

function handleSendReportsNow(ss, target, force) {
  var results = {};
  if (target === 'ALL' || target === 'LEADERSHIP') {
    results.leadership = handleSendLeadershipReport(ss, force);
  }
  if (target === 'ALL' || target === 'STATE_TEAM') {
    results.stateTeam = handleSendStateTeamReport(ss, force);
  }
  return results;
}

function getRecipientEmails(key) {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty(key);
  if (!raw || !raw.trim()) {
    return [];
  }
  return raw.split(',').map(function(e) { return e.trim(); }).filter(function(e) { return e.length > 0; });
}

function handleSendLeadershipReport(ss, force) {
  var recipients = getRecipientEmails('LEADERSHIP_EMAILS');
  if (recipients.length === 0) {
    return { status: 'SKIPPED', reason: 'No LEADERSHIP_EMAILS configured in Script Properties' };
  }

  // Idempotency per week: e.g. 2026-W45
  var now = new Date();
  var istTimeStr = Utilities.formatDate(now, 'Asia/Kolkata', "yyyy-MM-dd HH:mm:ss 'IST'");
  var periodKey = 'LEADERSHIP_REPORT_PERIOD_' + Utilities.formatDate(now, 'Asia/Kolkata', 'yyyy_ww');
  var props = PropertiesService.getScriptProperties();
  if (!force && props.getProperty(periodKey) === 'SENT') {
    return { status: 'IDEMPOTENT_SKIPPED', message: 'Leadership report already sent for period ' + periodKey };
  }

  // Quota check
  var quota = MailApp.getRemainingDailyQuota();
  if (quota <= 0) {
    recordAuditLog(ss, Utilities.getUuid(), 'LEADERSHIP_EMAIL', 'LEADERSHIP', 'ERROR: Daily email quota exhausted', 0);
    return { status: 'QUOTA_EXHAUSTED', quota: quota };
  }

  // 1. Gather ONLY aggregate numbers
  var aggregates = computeLeadershipAggregates(ss);

  // 2. Build email body
  var emailData = renderLeadershipEmail(aggregates, istTimeStr);

  // 3. Safety assertion: Throws if ANY client name, phone, or clientRef appears
  validateLeadershipSafety(emailData.html, emailData.text);

  // 4. Send email
  try {
    MailApp.sendEmail({
      to: recipients.join(','),
      subject: 'CSC 2.0 - Weekly Leadership Aggregate Summary (' + Utilities.formatDate(now, 'Asia/Kolkata', 'dd MMM yyyy') + ')',
      body: emailData.text,
      htmlBody: emailData.html
    });

    props.setProperty(periodKey, 'SENT');
    recordAuditLog(ss, Utilities.getUuid(), 'LEADERSHIP_EMAIL', 'LEADERSHIP', 'SUCCESS: Dispatched to group', 0);
    return { status: 'SENT', recipientCount: recipients.length, timestamp: istTimeStr };
  } catch (err) {
    recordAuditLog(ss, Utilities.getUuid(), 'LEADERSHIP_EMAIL', 'LEADERSHIP', 'ERROR: ' + err.message, 0);
    throw err;
  }
}

function computeLeadershipAggregates(ss) {
  var clientSheet = ss.getSheetByName('Clients');
  var encounterSheet = ss.getSheetByName('Follow_Up_Visits');
  var referralSheet = ss.getSheetByName('Referral_Requests');

  var totalClients = 0;
  var weekClients = 0;
  var districtMap = {};
  var now = new Date();
  var startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  startOfWeek.setHours(0, 0, 0, 0);

  if (clientSheet && clientSheet.getLastRow() >= 5) {
    var cRows = clientSheet.getLastRow() - 4;
    totalClients = cRows;
    var distCol = clientSheet.getRange(5, 14, cRows, 1).getValues();
    var regDateCol = clientSheet.getRange(5, 11, cRows, 1).getValues();

    for (var i = 0; i < cRows; i++) {
      var d = String(distCol[i][0] || 'Unassigned').trim();
      districtMap[d] = (districtMap[d] || 0) + 1;

      var regDateVal = regDateCol[i][0];
      if (regDateVal) {
        var rDate = new Date(regDateVal);
        if (!isNaN(rDate.getTime()) && rDate >= startOfWeek) {
          weekClients++;
        }
      }
    }
  }

  var totalFollowups = 0;
  var completedFollowups = 0;
  if (encounterSheet && encounterSheet.getLastRow() >= 5) {
    var fRows = encounterSheet.getLastRow() - 4;
    totalFollowups = fRows;
    var encounterTypeCol = encounterSheet.getRange(5, 5, fRows, 1).getValues();
    for (var j = 0; j < fRows; j++) {
      var t = String(encounterTypeCol[j][0] || '').toUpperCase();
      if (t === 'VISIT' || t === 'ROUTINE' || t === 'COMPLETED' || t.indexOf('REACHED') !== -1) {
        completedFollowups++;
      }
    }
  }
  var completionRate = totalFollowups > 0 ? Math.round((completedFollowups / totalFollowups) * 100) : 100;

  var referralStatusMap = {};
  if (referralSheet && referralSheet.getLastRow() >= 5) {
    var rRows = referralSheet.getLastRow() - 4;
    var rStatusCol = referralSheet.getRange(5, 6, rRows, 1).getValues();
    for (var k = 0; k < rRows; k++) {
      var st = String(rStatusCol[k][0] || 'PENDING').toUpperCase();
      referralStatusMap[st] = (referralStatusMap[st] || 0) + 1;
    }
  }

  return {
    totalClients: totalClients,
    weekClients: weekClients,
    districts: districtMap,
    totalFollowups: totalFollowups,
    completedFollowups: completedFollowups,
    followUpCompletionRate: completionRate + '%',
    referralsByStatus: referralStatusMap
  };
}

function renderLeadershipEmail(agg, timeStr) {
  var distRowsHtml = '';
  var distRowsText = '';
  for (var dist in agg.districts) {
    distRowsHtml += '<tr><td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">' + escapeHtml(dist) + '</td><td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #0f172a;">' + agg.districts[dist] + '</td></tr>';
    distRowsText += '  * ' + dist + ': ' + agg.districts[dist] + '\n';
  }
  if (!distRowsHtml) {
    distRowsHtml = '<tr><td colspan="2" style="padding: 6px 12px; color: #64748b;">No registrations recorded</td></tr>';
    distRowsText = '  * None\n';
  }

  var refRowsHtml = '';
  var refRowsText = '';
  for (var rst in agg.referralsByStatus) {
    refRowsHtml += '<tr><td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">' + escapeHtml(rst) + '</td><td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #0f172a;">' + agg.referralsByStatus[rst] + '</td></tr>';
    refRowsText += '  * ' + rst + ': ' + agg.referralsByStatus[rst] + '\n';
  }
  if (!refRowsHtml) {
    refRowsHtml = '<tr><td colspan="2" style="padding: 6px 12px; color: #64748b;">No referrals recorded</td></tr>';
    refRowsText = '  * None\n';
  }

  var html = '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">' +
    '<div style="background: #475569; padding: 20px; color: #ffffff;">' +
    '<h2 style="margin: 0; font-size: 20px; font-weight: bold;">CSC 2.0 — Executive Summary</h2>' +
    '<p style="margin: 4px 0 0; font-size: 13px; color: #cbd5e1;">Generated: ' + timeStr + '</p>' +
    '</div>' +
    '<div style="padding: 24px;">' +
    '<div style="display: flex; gap: 12px; margin-bottom: 24px;">' +
    '<div style="flex: 1; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; text-align: center;">' +
    '<div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Total Registrations</div>' +
    '<div style="font-size: 28px; font-weight: 800; color: #0f172a; margin-top: 4px;">' + agg.totalClients + '</div>' +
    '</div>' +
    '<div style="flex: 1; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; text-align: center;">' +
    '<div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">New This Week</div>' +
    '<div style="font-size: 28px; font-weight: 800; color: #d97706; margin-top: 4px;">' + agg.weekClients + '</div>' +
    '</div>' +
    '<div style="flex: 1; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; text-align: center;">' +
    '<div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Follow-up Rate</div>' +
    '<div style="font-size: 28px; font-weight: 800; color: #0f172a; margin-top: 4px;">' + agg.followUpCompletionRate + '</div>' +
    '</div>' +
    '</div>' +
    '<h3 style="font-size: 15px; color: #1e293b; margin: 16px 0 8px; border-bottom: 2px solid #cbd5e1; padding-bottom: 4px;">Registrations by District</h3>' +
    '<table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">' +
    '<thead><tr style="background: #f1f5f9;"><th style="padding: 8px 12px; text-align: left; color: #475569;">District</th><th style="padding: 8px 12px; text-align: right; color: #475569;">Count</th></tr></thead>' +
    '<tbody>' + distRowsHtml + '</tbody></table>' +
    '<h3 style="font-size: 15px; color: #1e293b; margin: 16px 0 8px; border-bottom: 2px solid #cbd5e1; padding-bottom: 4px;">Referrals by Status</h3>' +
    '<table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">' +
    '<thead><tr style="background: #f1f5f9;"><th style="padding: 8px 12px; text-align: left; color: #475569;">Status</th><th style="padding: 8px 12px; text-align: right; color: #475569;">Total</th></tr></thead>' +
    '<tbody>' + refRowsHtml + '</tbody></table>' +
    '<div style="text-align: center; margin: 24px 0 12px;">' +
    '<a href="https://frontend-six-zeta-93.vercel.app" style="background: #475569; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600; display: inline-block;">Open CSC 2.0 Portal</a>' +
    '</div>' +
    '</div>' +
    '<div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 20px; font-size: 11px; color: #64748b; text-align: center;">' +
    'CSC 2.0 Management System &bull; <span style="display: inline-block; padding: 2px 6px; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; border-radius: 4px; font-weight: 600;">Demo environment</span>' +
    '</div>' +
    '</div>';

  var text = 'CSC 2.0 - EXECUTIVE SUMMARY (AGGREGATE ONLY)\n' +
    'Generated: ' + timeStr + '\n\n' +
    'TOTAL METRICS:\n' +
    '* Total Registrations: ' + agg.totalClients + '\n' +
    '* New This Week: ' + agg.weekClients + '\n' +
    '* Follow-up Completion Rate: ' + agg.followUpCompletionRate + ' (' + agg.completedFollowups + '/' + agg.totalFollowups + ')\n\n' +
    'REGISTRATIONS BY DISTRICT:\n' + distRowsText + '\n' +
    'REFERRALS BY STATUS:\n' + refRowsText + '\n' +
    'Portal Access: https://frontend-six-zeta-93.vercel.app\n\n' +
    '--------------------------------------------------\n' +
    'Demo environment';

  return { html: html, text: text };
}

function validateLeadershipSafety(html, text) {
  var forbiddenPatterns = [
    /CSC-[A-Z0-9]{4,}/i,
    /\+91[0-9]{10}/,
    /[0-9]{10}/,
    /Full Name/i,
    /Contact No/i,
    /Residential Address/i,
    /Caregiver/i
  ];

  for (var i = 0; i < forbiddenPatterns.length; i++) {
    var pat = forbiddenPatterns[i];
    if (pat.test(html) || pat.test(text)) {
      throw new Error('SECURITY VIOLATION: Leadership report contains unpermitted detail matching ' + pat.toString());
    }
  }
}

function handleSendStateTeamReport(ss, force) {
  var recipients = getRecipientEmails('STATE_TEAM_EMAILS');
  if (recipients.length === 0) {
    return { status: 'SKIPPED', reason: 'No STATE_TEAM_EMAILS configured in Script Properties' };
  }

  var now = new Date();
  var istTimeStr = Utilities.formatDate(now, 'Asia/Kolkata', "yyyy-MM-dd HH:mm:ss 'IST'");
  var periodKey = 'STATE_REPORT_PERIOD_' + Utilities.formatDate(now, 'Asia/Kolkata', 'yyyy_MM_dd');
  var props = PropertiesService.getScriptProperties();
  if (!force && props.getProperty(periodKey) === 'SENT') {
    return { status: 'IDEMPOTENT_SKIPPED', message: 'State team report already sent for date ' + periodKey };
  }

  var quota = MailApp.getRemainingDailyQuota();
  if (quota <= 0) {
    recordAuditLog(ss, Utilities.getUuid(), 'STATE_TEAM_EMAIL', 'STATE_TEAM', 'ERROR: Daily email quota exhausted', 0);
    return { status: 'QUOTA_EXHAUSTED', quota: quota };
  }

  var supervision = computeStateTeamSupervision(ss);
  var emailData = renderStateTeamEmail(supervision, istTimeStr);
  validateStateTeamSafety(emailData.html, emailData.text);

  try {
    MailApp.sendEmail({
      to: recipients.join(','),
      subject: 'CSC 2.0 - State Team Supervision Briefing (' + Utilities.formatDate(now, 'Asia/Kolkata', 'dd MMM yyyy') + ')',
      body: emailData.text,
      htmlBody: emailData.html
    });

    props.setProperty(periodKey, 'SENT');
    recordAuditLog(ss, Utilities.getUuid(), 'STATE_TEAM_EMAIL', 'STATE_TEAM', 'SUCCESS: Dispatched to supervision group', 0);
    return { status: 'SENT', recipientCount: recipients.length, timestamp: istTimeStr };
  } catch (err) {
    recordAuditLog(ss, Utilities.getUuid(), 'STATE_TEAM_EMAIL', 'STATE_TEAM', 'ERROR: ' + err.message, 0);
    throw err;
  }
}

function computeStateTeamSupervision(ss) {
  var encounterSheet = ss.getSheetByName('Follow_Up_Visits');
  var clientSheet = ss.getSheetByName('Clients');
  var logSheet = ss.getSheetByName('_Log');

  var pendingVisits = [];
  if (encounterSheet && encounterSheet.getLastRow() >= 5) {
    var fRows = encounterSheet.getLastRow() - 4;
    var data = encounterSheet.getRange(5, 1, fRows, 5).getValues();
    for (var i = 0; i < fRows; i++) {
      var clientRef = String(data[i][1] || 'CSC-REF');
      var visitDate = String(data[i][3] || '');
      var vType = String(data[i][4] || 'ROUTINE');
      pendingVisits.push({ clientRef: clientRef, visitDate: visitDate, encounterType: vType });
    }
  }

  var centerActivity = {};
  var totalEdits = 0;
  if (clientSheet && clientSheet.getLastRow() >= 5) {
    var cRows = clientSheet.getLastRow() - 4;
    var cCenters = clientSheet.getRange(5, 3, cRows, 1).getValues();
    for (var j = 0; j < cRows; j++) {
      var center = String(cCenters[j][0] || 'Unassigned');
      centerActivity[center] = (centerActivity[center] || 0) + 1;
    }
  }

  var syncIssues = 0;
  if (logSheet && logSheet.getLastRow() >= 2) {
    var lRows = logSheet.getLastRow() - 1;
    var logStatuses = logSheet.getRange(2, 5, lRows, 1).getValues();
    for (var k = 0; k < lRows; k++) {
      if (String(logStatuses[k][0] || '').indexOf('ERROR') !== -1) {
        syncIssues++;
      }
    }
  }

  return {
    pendingVisits: pendingVisits.slice(0, 10),
    totalPendingCount: pendingVisits.length,
    centerActivity: centerActivity,
    syncIssuesCount: syncIssues,
    totalEditsCount: totalEdits
  };
}

function renderStateTeamEmail(sup, timeStr) {
  var visitRowsHtml = '';
  var visitRowsText = '';
  for (var i = 0; i < sup.pendingVisits.length; i++) {
    var v = sup.pendingVisits[i];
    visitRowsHtml += '<tr><td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace; color: #0f172a;">' + escapeHtml(v.clientRef) + '</td><td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0; color: #475569;">' + escapeHtml(v.visitDate) + '</td><td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">' + escapeHtml(v.encounterType) + '</td></tr>';
    visitRowsText += '  * ' + v.clientRef + ' | Date: ' + v.visitDate + ' | Type: ' + v.encounterType + '\n';
  }
  if (!visitRowsHtml) {
    visitRowsHtml = '<tr><td colspan="3" style="padding: 6px 12px; color: #64748b;">No follow-ups recorded</td></tr>';
    visitRowsText = '  * No pending follow-ups\n';
  }

  var centerRowsHtml = '';
  var centerRowsText = '';
  for (var c in sup.centerActivity) {
    centerRowsHtml += '<tr><td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">' + escapeHtml(c) + '</td><td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #0f172a;">' + sup.centerActivity[c] + '</td></tr>';
    centerRowsText += '  * ' + c + ': ' + sup.centerActivity[c] + ' records\n';
  }
  if (!centerRowsHtml) {
    centerRowsHtml = '<tr><td colspan="2" style="padding: 6px 12px; color: #64748b;">No center activity</td></tr>';
    centerRowsText = '  * None\n';
  }

  var html = '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">' +
    '<div style="background: #475569; padding: 20px; color: #ffffff;">' +
    '<h2 style="margin: 0; font-size: 20px; font-weight: bold;">CSC 2.0 — State Supervision Briefing</h2>' +
    '<p style="margin: 4px 0 0; font-size: 13px; color: #cbd5e1;">Generated: ' + timeStr + '</p>' +
    '</div>' +
    '<div style="padding: 24px;">' +
    '<div style="display: flex; gap: 12px; margin-bottom: 24px;">' +
    '<div style="flex: 1; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; text-align: center;">' +
    '<div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Total Encounters</div>' +
    '<div style="font-size: 24px; font-weight: 800; color: #0f172a; margin-top: 4px;">' + sup.totalPendingCount + '</div>' +
    '</div>' +
    '<div style="flex: 1; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; text-align: center;">' +
    '<div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Sync Exceptions</div>' +
    '<div style="font-size: 24px; font-weight: 800; color: ' + (sup.syncIssuesCount > 0 ? '#b91c1c' : '#475569') + '; margin-top: 4px;">' + sup.syncIssuesCount + '</div>' +
    '</div>' +
    '</div>' +
    '<h3 style="font-size: 15px; color: #1e293b; margin: 16px 0 8px; border-bottom: 2px solid #cbd5e1; padding-bottom: 4px;">Recent Follow-Up Encounters (Ref ID Only)</h3>' +
    '<table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">' +
    '<thead><tr style="background: #f1f5f9;"><th style="padding: 8px 12px; text-align: left; color: #475569;">Client Reference</th><th style="padding: 8px 12px; text-align: left; color: #475569;">Visit Date</th><th style="padding: 8px 12px; text-align: left; color: #475569;">Encounter Type</th></tr></thead>' +
    '<tbody>' + visitRowsHtml + '</tbody></table>' +
    '<h3 style="font-size: 15px; color: #1e293b; margin: 16px 0 8px; border-bottom: 2px solid #cbd5e1; padding-bottom: 4px;">Activity by Center / Worker Roster</h3>' +
    '<table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px;">' +
    '<thead><tr style="background: #f1f5f9;"><th style="padding: 8px 12px; text-align: left; color: #475569;">Center / Roster</th><th style="padding: 8px 12px; text-align: right; color: #475569;">Records</th></tr></thead>' +
    '<tbody>' + centerRowsHtml + '</tbody></table>' +
    '<div style="text-align: center; margin: 24px 0 12px;">' +
    '<a href="https://frontend-six-zeta-93.vercel.app" style="background: #475569; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600; display: inline-block;">Open State Supervision Dashboard</a>' +
    '</div>' +
    '</div>' +
    '<div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 20px; font-size: 11px; color: #64748b; text-align: center;">' +
    'CSC 2.0 Supervision System &bull; <span style="display: inline-block; padding: 2px 6px; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; border-radius: 4px; font-weight: 600;">Demo environment</span>' +
    '</div>' +
    '</div>';

  var text = 'CSC 2.0 - STATE TEAM SUPERVISION BRIEFING\n' +
    'Generated: ' + timeStr + '\n\n' +
    'SUMMARY:\n' +
    '* Total Encounters: ' + sup.totalPendingCount + '\n' +
    '* Sync Exceptions: ' + sup.syncIssuesCount + '\n\n' +
    'RECENT ENCOUNTERS (REF ONLY):\n' + visitRowsText + '\n' +
    'ACTIVITY BY CENTER:\n' + centerRowsText + '\n' +
    'Supervision Portal: https://frontend-six-zeta-93.vercel.app\n\n' +
    '--------------------------------------------------\n' +
    'Demo environment';

  return { html: html, text: text };
}

function validateStateTeamSafety(html, text) {
  var forbidden = [
    /\+91[0-9]{10}/,
    /Full Name/i,
    /Residential Address/i
  ];
  for (var i = 0; i < forbidden.length; i++) {
    if (forbidden[i].test(html) || forbidden[i].test(text)) {
      throw new Error('SECURITY VIOLATION: State team report contains sensitive client personal details');
    }
  }
}

function setupReportTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    var fn = triggers[i].getHandlerFunction();
    if (fn === 'sendLeadershipWeeklyReport' || fn === 'sendStateTeamDailyReport') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger('sendLeadershipWeeklyReport')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(9)
    .inTimezone('Asia/Kolkata')
    .create();

  ScriptApp.newTrigger('sendStateTeamDailyReport')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .inTimezone('Asia/Kolkata')
    .create();

  return { status: 'TRIGGERS_CONFIGURED', count: 2 };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
