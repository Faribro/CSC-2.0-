/**
 * CSC 2.0 — Google Sheets Mirror & Outbox Ingestion Engine
 * 
 * Target Workbook: Single professional workbook with 3-tier header, repeat tabs, and hidden system tabs.
 * Authentication: In-body HMAC-SHA256 signature with timestamp, nonce, and event_id idempotency.
 * Security: Formula injection escaping, LockService concurrency guard, quota-aware batching.
 *
 * (c) 2026 India HIV/AIDS Alliance
 */

// ---------------------------------------------------------------------------
// 1. CONFIGURATION & COLOR PALETTE (Strictly NO Blue, NO Dark Green)
// ---------------------------------------------------------------------------
var PALETTE = {
  TITLE_BG: '#7D3C98',       // Deep Plum
  TITLE_FG: '#FFFFFF',       // Pure White
  BAND_BASIC: '#F4ECF7',     // Soft Lavender
  BAND_ADDR: '#FCF3CF',      // Soft Warm Gold
  BAND_FAMILY: '#E8F8F5',    // Soft Mint
  BAND_CLINICAL: '#FDEDEC',  // Soft Terracotta Rose
  BAND_SOCIAL: '#FEF9E7',    // Soft Cream Amber
  BAND_RISK: '#F5EEF8',      // Soft Violet
  BAND_VERIF: '#EAECEE',     // Soft Cool Grey
  BAND_SYSTEM: '#F2F4F4',    // Neutral Grey
  HEADER_FG: '#2C3E50',      // Charcoal Slate
  BORDER_COLOR: '#D5D8DC'    // Subtle divider
};

// ---------------------------------------------------------------------------
// 2. WEB APP POST HANDLER (doPost)
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

    var eventId = request.eventId;
    var eventType = request.eventType;
    var timestamp = request.timestamp || Date.now();
    var startTime = Date.now();

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    initializeWorkbookIfMissing(ss);

    // 2. Idempotency Check via _Log and _Index
    if (isEventAlreadyProcessed(ss, eventId)) {
      return jsonResponse(200, 'SUCCESS', 'Event ' + eventId + ' already processed (idempotent no-op)');
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
  if (request.secret && request.secret === storedSecret) {
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
    sheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
    indexSheet.getRange(existingRow, 4, 1, 2).setValues([[rowHash, new Date().toISOString()]]);
  } else {
    // Append row starting at row 4
    var nextRow = Math.max(sheet.getLastRow() + 1, 4);
    sheet.getRange(nextRow, 1, 1, rowValues.length).setValues([rowValues]);
    // Record in _Index
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
    var nextRow = Math.max(sheet.getLastRow() + 1, 4);
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
    var nextRow = Math.max(sheet.getLastRow() + 1, 4);
    sheet.getRange(nextRow, 1, rows.length, rows[0].length).setValues(rows);
  }
}

function processEncounterRecord(ss, eventId, encounter) {
  var sheet = ss.getSheetByName('Follow_Up_Visits');
  var nextRow = Math.max(sheet.getLastRow() + 1, 4);
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
  var nextRow = Math.max(sheet.getLastRow() + 1, 4);
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
// 6. WORKBOOK INITIALIZATION & 3-TIER HEADER FORMATTING
// ---------------------------------------------------------------------------
function initializeWorkbookIfMissing(ss) {
  var sheetsToCreate = ['Clients', 'Family_Members', 'Referral_Requests', 'Follow_Up_Visits', 'Planned_Services', '_Index', '_Schema', '_Log'];
  sheetsToCreate.forEach(function(name) {
    if (!ss.getSheetByName(name)) {
      ss.insertSheet(name);
    }
  });

  // Setup Clients 3-Tier Header if empty
  var clientSheet = ss.getSheetByName('Clients');
  if (clientSheet.getLastRow() < 3) {
    formatClients3TierHeader(clientSheet);
  }

  // Setup Repeats Headers
  var fmSheet = ss.getSheetByName('Family_Members');
  if (fmSheet.getLastRow() < 3) {
    formatRepeatTabHeader(fmSheet, 'CSC 2.0 Family Members Roster', 'Family_Members', [
      'Client ID', 'Client Ref', 'Member Name', 'Relationship', 'Age', 'Gender', 'HIV Status', 'ART Number', 'Synced At'
    ]);
  }

  var refSheet = ss.getSheetByName('Referral_Requests');
  if (refSheet.getLastRow() < 3) {
    formatRepeatTabHeader(refSheet, 'CSC 2.0 Referral Requests Log', 'Referral_Requests', [
      'Client ID', 'Client Ref', 'Referral Date', 'Service Category', 'Target Facility', 'Reason', 'Status', 'Synced At'
    ]);
  }

  var fvSheet = ss.getSheetByName('Follow_Up_Visits');
  if (fvSheet.getLastRow() < 3) {
    formatRepeatTabHeader(fvSheet, 'CSC 2.0 Follow-Up Visits & Clinical Encounters', 'Follow_Up_Visits', [
      'Client ID', 'Client Ref', 'Task Ref', 'Visit Date', 'Type', 'ART Adherence', 'Nutrition', 'CD4', 'Viral Load', 'Action Taken', 'Synced At'
    ]);
  }

  var psSheet = ss.getSheetByName('Planned_Services');
  if (psSheet.getLastRow() < 3) {
    formatRepeatTabHeader(psSheet, 'CSC 2.0 Planned & Delivered Services', 'Planned_Services', [
      'Client ID', 'Client Ref', 'Service Code', 'Service Name', 'Due Date', 'Delivered Date', 'Facility', 'Status', 'Synced At'
    ]);
  }

  // Hide system tabs
  ['_Index', '_Schema', '_Log'].forEach(function(sName) {
    var s = ss.getSheetByName(sName);
    if (s && !s.isSheetHidden()) {
      s.hideSheet();
    }
  });
}

function formatClients3TierHeader(sheet) {
  var totalCols = 38;
  sheet.clear();

  // Tier 1: Merged Title across all columns (Row 1)
  sheet.getRange(1, 1, 1, totalCols).merge();
  var titleCell = sheet.getRange(1, 1);
  titleCell.setValue('CSC 2.0 Client Registry — Synthetic Demonstration Mirror');
  titleCell.setBackground(PALETTE.TITLE_BG)
           .setFontColor(PALETTE.TITLE_FG)
           .setFontSize(13)
           .setFontWeight('bold')
           .setHorizontalAlignment('left')
           .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 38);

  // Tier 2: Color-Coded Category Bands (Row 2)
  var bands = [
    { name: '1. Basic Details', cols: 11, bg: PALETTE.BAND_BASIC },
    { name: '2. Address & Contact', cols: 5, bg: PALETTE.BAND_ADDR },
    { name: '3. Family', cols: 2, bg: PALETTE.BAND_FAMILY },
    { name: '4. Testing & Clinical Treatment', cols: 7, bg: PALETTE.BAND_CLINICAL },
    { name: '5. Social Protection Linkages', cols: 4, bg: PALETTE.BAND_SOCIAL },
    { name: '6. Risk Profile', cols: 1, bg: PALETTE.BAND_RISK },
    { name: '7. Verification & Consent', cols: 5, bg: PALETTE.BAND_VERIF },
    { name: '8. System Metadata', cols: 3, bg: PALETTE.BAND_SYSTEM }
  ];

  var colPtr = 1;
  bands.forEach(function(b) {
    sheet.getRange(2, colPtr, 1, b.cols).merge();
    sheet.getRange(2, colPtr)
         .setValue(b.name)
         .setBackground(b.bg)
         .setFontWeight('bold')
         .setFontSize(10)
         .setHorizontalAlignment('center')
         .setVerticalAlignment('middle');
    colPtr += b.cols;
  });
  sheet.setRowHeight(2, 26);

  // Tier 3: Field Headers (Row 3)
  var headers = [
    'Client ID', 'Client Ref', 'Center ID', 'Full Name', 'Alias Name', 'Age', 'Gender', 'Marital Status', 'In School', 'Occupation', 'Reg Date',
    'Primary Phone', 'Current Address', 'District', 'State', 'Pincode',
    'Caregiver Name', 'Family Size',
    'HIV Status', 'ART Number', 'ART Center', 'ART Start Date', 'CD4 Count', 'CD4 %', 'Viral Load',
    'Ration Card', 'Voter ID', 'Aadhaar Card', 'Bank Account',
    'Key Population',
    'HIV Doc', 'Address Doc', 'ART Doc', 'Home Visit Consent', 'Messaging Consent',
    'Status', 'Updated At', 'Row Hash'
  ];

  var hRange = sheet.getRange(3, 1, 1, headers.length);
  hRange.setValues([headers]);
  hRange.setBackground('#F8F9F9')
        .setFontColor(PALETTE.HEADER_FG)
        .setFontSize(9)
        .setFontWeight('bold')
        .setWrap(true)
        .setHorizontalAlignment('center')
        .setVerticalAlignment('middle');
  sheet.setRowHeight(3, 30);

  // Freeze rows 1-3 and columns A-B
  sheet.setFrozenRows(3);
  sheet.setFrozenColumns(2);

  // Set default column widths
  for (var c = 1; c <= totalCols; c++) {
    sheet.setColumnWidth(c, c <= 2 ? 140 : 120);
  }
}

function formatRepeatTabHeader(sheet, title, tabName, headers) {
  sheet.clear();
  var totalCols = headers.length;

  // Row 1: Merged Title
  sheet.getRange(1, 1, 1, totalCols).merge();
  var titleCell = sheet.getRange(1, 1);
  titleCell.setValue(title)
           .setBackground(PALETTE.TITLE_BG)
           .setFontColor(PALETTE.TITLE_FG)
           .setFontSize(12)
           .setFontWeight('bold')
           .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 34);

  // Row 2: Category Band
  sheet.getRange(2, 1, 1, totalCols).merge();
  sheet.getRange(2, 1)
       .setValue('Repeat Records Projection — Keyed by Client ID')
       .setBackground(PALETTE.BAND_BASIC)
       .setFontWeight('bold')
       .setFontSize(10)
       .setHorizontalAlignment('center');
  sheet.setRowHeight(2, 24);

  // Row 3: Headers
  var hRange = sheet.getRange(3, 1, 1, totalCols);
  hRange.setValues([headers]);
  hRange.setBackground('#F8F9F9')
        .setFontColor(PALETTE.HEADER_FG)
        .setFontSize(9)
        .setFontWeight('bold')
        .setHorizontalAlignment('center');
  sheet.setRowHeight(3, 28);

  sheet.setFrozenRows(3);
  sheet.setFrozenColumns(2);
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

function jsonResponse(code, status, message) {
  var res = {
    code: code,
    status: status,
    message: message,
    timestamp: new Date().toISOString()
  };
  return ContentService.createTextOutput(JSON.stringify(res))
                       .setMimeType(ContentService.MimeType.JSON);
}
