/**
 * CSC 2.0 Follow-Up Platform — Production Google Apps Script Sheet Mirror Gateway
 *
 * Capabilities:
 * - O(1) Amortised Natural Key Index Map (_Index tab)
 * - Row Canonical SHA-256 Hash Idempotency & Conflict Check
 * - Formula Injection Defense (Escapes =, +, -, @)
 * - ScriptLock Concurrency Protection (10s bounded timeout)
 * - Explicit Multi-Tab Schema Enforcement (Clients, Family_Members, Encounters, etc.)
 * - Diagnostic Header Inspection (Proves e.headers absence in Apps Script runtime)
 */

var SPREADSHEET_ID = "1onMDhrdr5c8fcBRsvtelN_vGQ0R8W8zMFeOU0pxEHVM";

// Canonical Schema Definitions
var SCHEMA_DEFS = {
  Clients: [
    { name: "record_id", type: "UUID", source: "client.id", tier: "Tier 1" },
    { name: "client_ref", type: "VARCHAR", source: "client.client_ref", tier: "Tier 1" },
    { name: "center_id", type: "VARCHAR", source: "client.center_id", tier: "Tier 1" },
    { name: "full_name", type: "VARCHAR", source: "a01_full_name", tier: "Tier 2" },
    { name: "age", type: "INTEGER", source: "a03_age", tier: "Tier 1" },
    { name: "gender", type: "VARCHAR", source: "a04_gender", tier: "Tier 1" },
    { name: "hiv_status", type: "VARCHAR", source: "c01_hiv_status", tier: "Tier 3" },
    { name: "art_number", type: "VARCHAR", source: "c03_art_number", tier: "Tier 3" },
    { name: "recorded_at", type: "TIMESTAMP", source: "created_at", tier: "Tier 1" },
    { name: "mirrored_at", type: "TIMESTAMP", source: "mirrored_at", tier: "Tier 1" },
    { name: "row_hash", type: "VARCHAR", source: "row_hash", tier: "Tier 1" }
  ],
  Family_Members: [
    { name: "record_id", type: "UUID", source: "family_member.id", tier: "Tier 1" },
    { name: "client_id", type: "UUID", source: "client.id", tier: "Tier 1" },
    { name: "member_name", type: "VARCHAR", source: "b2_member_name", tier: "Tier 2" },
    { name: "relationship", type: "VARCHAR", source: "b2_relationship", tier: "Tier 1" },
    { name: "age", type: "INTEGER", source: "b2_age", tier: "Tier 1" },
    { name: "hiv_status", type: "VARCHAR", source: "b2_hiv_status", tier: "Tier 3" },
    { name: "row_hash", type: "VARCHAR", source: "row_hash", tier: "Tier 1" }
  ],
  Referral_Requests: [
    { name: "record_id", type: "UUID", source: "referral_request.id", tier: "Tier 1" },
    { name: "client_id", type: "UUID", source: "client.id", tier: "Tier 1" },
    { name: "referral_category", type: "VARCHAR", source: "d5_category", tier: "Tier 1" },
    { name: "facility_name", type: "VARCHAR", source: "d5_facility", tier: "Tier 1" },
    { name: "target_due_date", type: "DATE", source: "d5_due_date", tier: "Tier 1" },
    { name: "status", type: "VARCHAR", source: "status", tier: "Tier 1" },
    { name: "row_hash", type: "VARCHAR", source: "row_hash", tier: "Tier 1" }
  ],
  Encounters: [
    { name: "record_id", type: "UUID", source: "encounter.id", tier: "Tier 1" },
    { name: "client_id", type: "UUID", source: "client.id", tier: "Tier 1" },
    { name: "task_id", type: "UUID", source: "task.id", tier: "Tier 1" },
    { name: "observation_date", type: "DATE", source: "observation_date", tier: "Tier 1" },
    { name: "recorded_at", type: "TIMESTAMP", source: "recorded_at", tier: "Tier 1" },
    { name: "encounter_type", type: "VARCHAR", source: "encounter_type", tier: "Tier 1" },
    { name: "art_adherence", type: "VARCHAR", source: "i_art_adherence", tier: "Tier 2" },
    { name: "nutrition_status", type: "VARCHAR", source: "i_nutrition_status", tier: "Tier 2" },
    { name: "notes", type: "TEXT", source: "general_notes", tier: "Tier 2" },
    { name: "row_hash", type: "VARCHAR", source: "row_hash", tier: "Tier 1" }
  ],
  Planned_Services: [
    { name: "record_id", type: "UUID", source: "planned_service.id", tier: "Tier 1" },
    { name: "client_id", type: "UUID", source: "client.id", tier: "Tier 1" },
    { name: "purpose_code", type: "VARCHAR", source: "j5_purpose", tier: "Tier 1" },
    { name: "service_category", type: "VARCHAR", source: "j5_cat", tier: "Tier 1" },
    { name: "service_code", type: "VARCHAR", source: "j5_service", tier: "Tier 1" },
    { name: "target_due_date", type: "DATE", source: "j5_planned_date", tier: "Tier 1" },
    { name: "status", type: "VARCHAR", source: "status", tier: "Tier 1" },
    { name: "row_hash", type: "VARCHAR", source: "row_hash", tier: "Tier 1" }
  ],
  Delivered_Services: [
    { name: "record_id", type: "UUID", source: "delivered_service.id", tier: "Tier 1" },
    { name: "client_id", type: "UUID", source: "client.id", tier: "Tier 1" },
    { name: "planned_service_id", type: "UUID", source: "planned_service_id", tier: "Tier 1" },
    { name: "delivery_date", type: "DATE", source: "delivery_date", tier: "Tier 1" },
    { name: "service_code", type: "VARCHAR", source: "service_code", tier: "Tier 1" },
    { name: "facility_name", type: "VARCHAR", source: "facility_name", tier: "Tier 1" },
    { name: "row_hash", type: "VARCHAR", source: "row_hash", tier: "Tier 1" }
  ],
  Consents_And_Declarations: [
    { name: "record_id", type: "UUID", source: "client.id", tier: "Tier 1" },
    { name: "client_id", type: "UUID", source: "client.id", tier: "Tier 1" },
    { name: "home_visit_consent", type: "BOOLEAN", source: "a08_consent_home", tier: "Tier 1" },
    { name: "messaging_consent", type: "BOOLEAN", source: "a08_consent_sms", tier: "Tier 1" },
    { name: "hiv_doc_declared", type: "BOOLEAN", source: "j_hiv_doc_sighted", tier: "Tier 1" },
    { name: "art_doc_declared", type: "BOOLEAN", source: "j_art_doc_sighted", tier: "Tier 1" },
    { name: "address_doc_declared", type: "BOOLEAN", source: "j_address_doc_sighted", tier: "Tier 1" },
    { name: "row_hash", type: "VARCHAR", source: "row_hash", tier: "Tier 1" }
  ],
  Outbox_Log: [
    { name: "event_id", type: "UUID", source: "event_id", tier: "Tier 1" },
    { name: "event_type", type: "VARCHAR", source: "event_type", tier: "Tier 1" },
    { name: "aggregate_type", type: "VARCHAR", source: "aggregate_type", tier: "Tier 1" },
    { name: "aggregate_id", type: "UUID", source: "aggregate_id", tier: "Tier 1" },
    { name: "received_at", type: "TIMESTAMP", source: "received_at", tier: "Tier 1" },
    { name: "status", type: "VARCHAR", source: "status", tier: "Tier 1" },
    { name: "row_hash", type: "VARCHAR", source: "row_hash", tier: "Tier 1" }
  ]
};

// Helper: Escape formula injection characters
function sanitizeValue(val) {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") {
    if (val.startsWith("=") || val.startsWith("+") || val.startsWith("-") || val.startsWith("@")) {
      return "'" + val; // Force text literal
    }
  }
  return val;
}

// Helper: SHA-256 Hex Digest
function sha256Hex(str) {
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8);
  var txt = "";
  for (var j = 0; j < rawHash.length; j++) {
    var byteVal = rawHash[j];
    if (byteVal < 0) byteVal += 256;
    var byteHex = byteVal.toString(16);
    if (byteHex.length === 1) byteHex = "0" + byteHex;
    txt += byteHex;
  }
  return txt;
}

// Helper: Constant-time string comparison against timing attacks
function constantTimeEquals(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) {
    diff |= (a.charCodeAt(i) ^ b.charCodeAt(i));
  }
  return diff === 0;
}

// Initialize all tabs, styling, schemas, and protections
function initSheetStructure() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Create or verify _Schema tab
  var schemaSheet = ss.getSheetByName("_Schema");
  if (!schemaSheet) {
    schemaSheet = ss.insertSheet("_Schema");
  }
  schemaSheet.clear();
  schemaSheet.appendRow(["Tab Name", "Column Name", "Type", "Source Field Path", "Tier Level"]);
  schemaSheet.getRange(1, 1, 1, 5).setBackground("#1E293B").setFontColor("#FFFFFF").setFontWeight("bold");

  for (var tab in SCHEMA_DEFS) {
    var cols = SCHEMA_DEFS[tab];
    for (var i = 0; i < cols.length; i++) {
      schemaSheet.appendRow([tab, cols[i].name, cols[i].type, cols[i].source, cols[i].tier]);
    }
  }
  schemaSheet.hideSheet();

  // Create or verify _Index tab
  var indexSheet = ss.getSheetByName("_Index");
  if (!indexSheet) {
    indexSheet = ss.insertSheet("_Index");
  }
  if (indexSheet.getLastRow() === 0) {
    indexSheet.appendRow(["key_hash", "tab_name", "record_id", "row_number", "row_hash", "updated_at"]);
    indexSheet.getRange(1, 1, 1, 6).setBackground("#1E293B").setFontColor("#FFFFFF").setFontWeight("bold");
    indexSheet.setFrozenRows(1);
  }
  indexSheet.hideSheet();

  // Create or verify entity tabs
  for (var tabName in SCHEMA_DEFS) {
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
    }
    if (sheet.getLastRow() === 0) {
      var headerCols = SCHEMA_DEFS[tabName].map(function(c) { return c.name; });
      sheet.appendRow(headerCols);
      sheet.getRange(1, 1, 1, headerCols.length)
           .setBackground("#0F766E")
           .setFontColor("#FFFFFF")
           .setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
  }

  return { status: "INITIALIZED", tabs: Object.keys(SCHEMA_DEFS).length };
}

// Check spreadsheet emptiness via authenticated Apps Script API
function checkSheetEmptiness() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheets = ss.getSheets();
  var result = [];
  for (var i = 0; i < sheets.length; i++) {
    var s = sheets[i];
    result.push({
      tabName: s.getName(),
      lastRow: s.getLastRow(),
      lastColumn: s.getLastColumn()
    });
  }
  Logger.log(JSON.stringify(result));
  return JSON.stringify(result);
}

// Load _Index tab into memory for O(1) Map lookup
function loadIndexMap(ss) {
  var indexSheet = ss.getSheetByName("_Index");
  if (!indexSheet) return { map: {}, rows: [] };
  var lastRow = indexSheet.getLastRow();
  if (lastRow <= 1) return { map: {}, rows: [] };

  var data = indexSheet.getRange(2, 1, lastRow - 1, 6).getValues();
  var map = {};
  for (var i = 0; i < data.length; i++) {
    var keyHash = data[i][0];
    map[keyHash] = {
      rowIndexInIndex: i + 2,
      tab: data[i][1],
      recordId: data[i][2],
      rowNumber: data[i][3],
      rowHash: data[i][4]
    };
  }
  return { map: map, data: data };
}

// Web App GET Handler
function doGet(e) {
  var headerCheck = {
    hasHeadersProperty: (typeof e !== 'undefined' && typeof e.headers !== 'undefined'),
    hasPostData: (typeof e !== 'undefined' && typeof e.postData !== 'undefined'),
    queryParametersReceived: (e && e.parameter) ? Object.keys(e.parameter) : [],
    supportedContract: "Payload-Body Gateway Credential (RFC 7231 302 Header-Stripping Compliant)"
  };

  return ContentService.createTextOutput(JSON.stringify({
    status: "UP",
    service: "CSC 2.0 Google Apps Script Mirror Gateway",
    timestamp: new Date().toISOString(),
    header_runtime_proof: headerCheck,
    spreadsheet_id: SPREADSHEET_ID
  })).setMimeType(ContentService.MimeType.JSON);
}

// Web App POST Handler
function doPost(e) {
  var headerProof = {
    received_headers_property: (typeof e !== 'undefined' && typeof e.headers !== 'undefined'),
    received_post_data: (typeof e !== 'undefined' && typeof e.postData !== 'undefined')
  };

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Wait up to 10 seconds for script lock
  } catch (lockErr) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error_code: "LOCK_TIMEOUT",
      message: "Server busy: lock timeout after 10000ms"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        error_code: "BAD_REQUEST",
        message: "Missing POST body"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var payload = JSON.parse(e.postData.contents);

    // Schema version check
    if (payload.schema_version && payload.schema_version !== "1.0") {
      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        error_code: "UNSUPPORTED_SCHEMA_VERSION",
        message: "Unsupported schema_version: " + payload.schema_version
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Authentication: Check gateway secret from body
    var configuredSecret = PropertiesService.getScriptProperties().getProperty("APPS_SCRIPT_GATEWAY_SECRET") || "local_gateway_synthetic_secret_token_12345";
    var providedSecret = payload.gatewaySecret || "";

    if (!constantTimeEquals(configuredSecret, providedSecret)) {
      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        error_code: "UNAUTHORIZED",
        message: "Invalid or missing gateway credential"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var tabName = payload.tab || "Clients";
    var schema = SCHEMA_DEFS[tabName];
    if (!schema) {
      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        error_code: "UNKNOWN_TAB",
        message: "Tab schema not registered: " + tabName
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var targetSheet = ss.getSheetByName(tabName);
    if (!targetSheet) {
      initSheetStructure();
      targetSheet = ss.getSheetByName(tabName);
    }

    var recordId = payload.record_id || payload.eventId || Utilities.getUuid();
    var keyHash = sha256Hex(tabName + "|" + recordId);

    // Compute canonical row values & row_hash
    var rowValues = [];
    var rowObjForHash = {};
    for (var i = 0; i < schema.length; i++) {
      var col = schema[i];
      var rawVal = (payload.row_data && payload.row_data[col.name] !== undefined)
          ? payload.row_data[col.name]
          : (payload[col.name] !== undefined ? payload[col.name] : "");

      if (col.name === "mirrored_at" || col.name === "received_at") {
        rawVal = new Date().toISOString();
      }
      var cleanVal = sanitizeValue(rawVal);
      rowValues.push(cleanVal);
      if (col.name !== "row_hash") {
        rowObjForHash[col.name] = cleanVal;
      }
    }

    var rowHash = sha256Hex(JSON.stringify(rowObjForHash));
    // Set row_hash in the rowValues array
    for (var h = 0; h < schema.length; h++) {
      if (schema[h].name === "row_hash") {
        rowValues[h] = rowHash;
        break;
      }
    }

    // O(1) Index Lookup
    var indexResult = loadIndexMap(ss);
    var indexEntry = indexResult.map[keyHash];
    var action = "INSERT";
    var targetRowNumber = targetSheet.getLastRow() + 1;

    var indexSheet = ss.getSheetByName("_Index");

    if (indexEntry) {
      // Record already exists
      if (indexEntry.rowHash === rowHash) {
        // Idempotent duplicate: Identical row hash -> NOOP
        return ContentService.createTextOutput(JSON.stringify({
          ok: true,
          action: "NOOP",
          event_id: payload.eventId || "",
          tab: tabName,
          row_number: indexEntry.rowNumber,
          row_hash: rowHash,
          header_runtime_proof: headerProof
        })).setMimeType(ContentService.MimeType.JSON);
      } else {
        // Update existing row
        action = "UPDATE";
        targetRowNumber = indexEntry.rowNumber;
        targetSheet.getRange(targetRowNumber, 1, 1, rowValues.length).setValues([rowValues]);
        // Update _Index row
        indexSheet.getRange(indexEntry.rowIndexInIndex, 5, 1, 2).setValues([[rowHash, new Date().toISOString()]]);
      }
    } else {
      // Append new row
      action = "INSERT";
      targetSheet.getRange(targetRowNumber, 1, 1, rowValues.length).setValues([rowValues]);
      // Append to _Index
      indexSheet.appendRow([keyHash, tabName, recordId, targetRowNumber, rowHash, new Date().toISOString()]);
    }

    // Log to Outbox_Log
    var logSheet = ss.getSheetByName("Outbox_Log");
    if (logSheet) {
      logSheet.appendRow([
        payload.eventId || Utilities.getUuid(),
        payload.eventType || "MIRROR_EVENT",
        tabName,
        recordId,
        new Date().toISOString(),
        "CONFIRMED",
        rowHash
      ]);
    }

    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      action: action,
      event_id: payload.eventId || "",
      tab: tabName,
      row_number: targetRowNumber,
      row_hash: rowHash,
      header_runtime_proof: headerProof
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error_code: "INTERNAL_ERROR",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
