package org.allianceindia.csc2.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@RestController
@RequestMapping("/api/mock")
@Profile({"local", "test", "dev", "default"})
public class MockGatewayController {

    private static final Logger log = LoggerFactory.getLogger(MockGatewayController.class);

    private final String expectedGatewaySecret;
    private final ObjectMapper objectMapper;

    // Simulated Workbook Tabs
    private final List<Map<String, Object>> clientsSheet = new CopyOnWriteArrayList<>();
    private final List<Map<String, Object>> familyMembersSheet = new CopyOnWriteArrayList<>();
    private final List<Map<String, Object>> referralsSheet = new CopyOnWriteArrayList<>();
    private final List<Map<String, Object>> followUpVisitsSheet = new CopyOnWriteArrayList<>();
    private final List<Map<String, Object>> plannedServicesSheet = new CopyOnWriteArrayList<>();
    private final Set<String> processedEventIds = ConcurrentHashMap.newKeySet();
    private final List<Map<String, Object>> auditLogSheet = new CopyOnWriteArrayList<>();

    public MockGatewayController(
            @Value("${app.apps-script.gateway-secret:local_gateway_synthetic_secret_token_12345}") String expectedGatewaySecret,
            ObjectMapper objectMapper) {
        this.expectedGatewaySecret = expectedGatewaySecret;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/apps-script-gateway")
    public ResponseEntity<Map<String, Object>> mockMirrorIngest(
            @RequestHeader(value = "X-Gateway-Secret", required = false) String headerSecret,
            @RequestBody String rawBody) {

        long startTime = System.currentTimeMillis();

        if (rawBody == null || rawBody.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("status", "BAD_REQUEST", "message", "Body required"));
        }

        Map<String, Object> request;
        try {
            request = objectMapper.readValue(rawBody, Map.class);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("status", "INVALID_JSON", "message", e.getMessage()));
        }

        // 1. Verify Authentication: Secret or HMAC-SHA256
        String secret = (String) request.get("secret");
        String signature = (String) request.get("signature");
        String eventId = (String) request.get("eventId");
        Long timestamp = request.get("timestamp") != null ? Long.valueOf(request.get("timestamp").toString()) : null;
        String nonce = (String) request.get("nonce");
        Object rawPayload = request.get("payload");

        boolean authValid = false;
        if (signature != null && timestamp != null && nonce != null && eventId != null) {
            // Check timestamp freshness (5 minutes)
            if (Math.abs(System.currentTimeMillis() - timestamp) > 300000) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                        "status", "UNAUTHORIZED", "message", "Timestamp skew exceeds 5-minute security window"
                ));
            }
            String payloadStr = rawPayload instanceof String ? (String) rawPayload : rawPayload != null ? rawPayload.toString() : "";
            String messageToSign = timestamp + ":" + nonce + ":" + eventId + ":" + payloadStr;
            String computedSig = computeHmacSha256(messageToSign, expectedGatewaySecret);
            if (computedSig.equalsIgnoreCase(signature)) {
                authValid = true;
            }
        } else if (secret != null && secret.equals(expectedGatewaySecret)) {
            authValid = true;
        } else if (headerSecret != null && headerSecret.equals(expectedGatewaySecret)) {
            authValid = true;
        }

        if (!authValid) {
            log.warn("Mock Apps Script gateway rejected invalid authentication / signature");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "status", "UNAUTHORIZED", "message", "Invalid gateway secret or HMAC signature"
            ));
        }

        // 2. Idempotency Check
        if (eventId != null && processedEventIds.contains(eventId)) {
            log.info("Mock Apps Script gateway: Event {} already processed (idempotent no-op)", eventId);
            return ResponseEntity.ok(Map.of(
                    "status", "SUCCESS",
                    "idempotent_noop", true,
                    "eventId", eventId,
                    "message", "Already ingested"
            ));
        }

        // 3. Process Payload & Simulate 3-tier Tab Projection
        try {
            Map<String, Object> payloadMap;
            if (rawPayload instanceof String) {
                payloadMap = objectMapper.readValue((String) rawPayload, Map.class);
            } else if (rawPayload instanceof Map) {
                payloadMap = (Map<String, Object>) rawPayload;
            } else {
                payloadMap = new HashMap<>();
            }

            // Formula injection escaping simulation: prepend ' to dangerous characters
            Map<String, Object> sanitized = sanitizePayload(payloadMap);
            clientsSheet.add(sanitized);

            // Repeats
            if (payloadMap.get("familyMembers") instanceof List) {
                List<Map<String, Object>> members = (List<Map<String, Object>>) payloadMap.get("familyMembers");
                for (Map<String, Object> m : members) {
                    familyMembersSheet.add(sanitizePayload(m));
                }
            }
            if (payloadMap.get("referralRequests") instanceof List) {
                List<Map<String, Object>> refs = (List<Map<String, Object>>) payloadMap.get("referralRequests");
                for (Map<String, Object> r : refs) {
                    referralsSheet.add(sanitizePayload(r));
                }
            }

            if (eventId != null) {
                processedEventIds.add(eventId);
            }

            long duration = System.currentTimeMillis() - startTime;
            auditLogSheet.add(Map.of(
                    "eventId", eventId != null ? eventId : UUID.randomUUID().toString(),
                    "eventType", request.getOrDefault("eventType", "UNKNOWN"),
                    "status", "SUCCESS",
                    "durationMs", duration,
                    "timestamp", System.currentTimeMillis()
            ));

            return ResponseEntity.ok(Map.of(
                    "status", "SUCCESS",
                    "eventId", eventId != null ? eventId : "",
                    "duration_ms", duration,
                    "workbook", "CSC2_MIRROR_WORKBOOK_SYNTHETIC",
                    "total_clients_in_mirror", clientsSheet.size()
            ));
        } catch (Exception ex) {
            log.error("Failed to project event into mock sheet", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "ERROR", "message", ex.getMessage()
            ));
        }
    }

    @GetMapping("/apps-script-gateway/status")
    public ResponseEntity<Map<String, Object>> getMirrorStatus() {
        return ResponseEntity.ok(Map.of(
                "workbook_name", "CSC 2.0 Client Registry — Synthetic Demonstration Mirror",
                "total_clients", clientsSheet.size(),
                "total_family_members", familyMembersSheet.size(),
                "total_referrals", referralsSheet.size(),
                "total_audit_events", auditLogSheet.size(),
                "processed_event_count", processedEventIds.size(),
                "recent_clients", clientsSheet.stream().limit(5).toList(),
                "header_tiers", List.of(
                        "Tier 1: Merged Title (Row 1)",
                        "Tier 2: Category Grouping Bands (Row 2)",
                        "Tier 3: 45° Rotated Field Headers (Row 3)",
                        "Tier 4: Column Numbers (Row 4)"
                )
        ));
    }

    @PostMapping("/apps-script-gateway/reset")
    public ResponseEntity<Map<String, String>> resetMirror() {
        clientsSheet.clear();
        familyMembersSheet.clear();
        referralsSheet.clear();
        followUpVisitsSheet.clear();
        plannedServicesSheet.clear();
        processedEventIds.clear();
        auditLogSheet.clear();
        return ResponseEntity.ok(Map.of("status", "RESET", "message", "Simulated workbook reset"));
    }

    private Map<String, Object> sanitizePayload(Map<String, Object> input) {
        Map<String, Object> out = new HashMap<>();
        for (Map.Entry<String, Object> entry : input.entrySet()) {
            Object val = entry.getValue();
            if (val instanceof String s) {
                if (s.startsWith("=") || s.startsWith("+") || s.startsWith("-") || s.startsWith("@")) {
                    out.put(entry.getKey(), "'" + s); // Prepend apostrophe to escape formula injection
                } else {
                    out.put(entry.getKey(), s);
                }
            } else {
                out.put(entry.getKey(), val);
            }
        }
        return out;
    }

    private String computeHmacSha256(String data, String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] hmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hmac);
        } catch (Exception e) {
            throw new RuntimeException("HMAC computation failed", e);
        }
    }
}
