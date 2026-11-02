/**
 * CSC 2.0 Follow-Up Platform — Apps Script Sheet Mirror Gateway
 *
 * Deployed as: Web App
 * Execute as: Me
 * Who has access: Anyone
 *
 * Script Properties:
 *   APPS_SCRIPT_GATEWAY_SECRET: <configured_secret>
 *   SPREADSHEET_ID: 1onMDhrdr5c8fcBRsvtelN_vGQ0R8W8zMFeOU0pxEHVM
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Wait up to 10s for concurrent writes
  } catch (f) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "ERROR",
      message: "Server busy, lock timeout"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "BAD_REQUEST",
        message: "Missing request body"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var payload = JSON.parse(e.postData.contents);

    // Authentication: Check gateway secret from payload (handles Google 302 redirect header stripping)
    var scriptSecret = PropertiesService.getScriptProperties().getProperty("APPS_SCRIPT_GATEWAY_SECRET");
    if (!scriptSecret) {
      // Default fallback for initial test
      scriptSecret = "local_gateway_synthetic_secret_token_12345";
    }

    var incomingSecret = payload.gatewaySecret || (e.parameter && e.parameter.secret);
    if (incomingSecret !== scriptSecret) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "UNAUTHORIZED",
        message: "Invalid or missing gateway secret"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Auto-initialize header row if empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Event ID",
        "Event Type",
        "Aggregate Type",
        "Aggregate ID",
        "Timestamp",
        "Payload JSON"
      ]);
    }

    // Append mirrored outbox event
    sheet.appendRow([
      payload.eventId || Utilities.getUuid(),
      payload.eventType || "UNKNOWN",
      payload.aggregateType || "CLIENT",
      payload.aggregateId || "",
      new Date().toISOString(),
      JSON.stringify(payload.data || payload)
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "SUCCESS",
      synced_at: new Date().toISOString(),
      sheet_name: sheet.getName(),
      row_index: sheet.getLastRow()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "ERROR",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "UP",
    service: "CSC 2.0 Google Apps Script Mirror Gateway",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
