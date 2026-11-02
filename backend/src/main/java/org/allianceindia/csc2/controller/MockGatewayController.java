package org.allianceindia.csc2.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/mock")
public class MockGatewayController {

    private static final Logger log = LoggerFactory.getLogger(MockGatewayController.class);

    private final String expectedGatewaySecret;

    public MockGatewayController(@Value("${app.apps-script.gateway-secret:local_gateway_synthetic_secret_token_12345}") String expectedGatewaySecret) {
        this.expectedGatewaySecret = expectedGatewaySecret;
    }

    @PostMapping("/apps-script-gateway")
    public ResponseEntity<Map<String, Object>> mockMirrorIngest(
            @RequestHeader(value = "X-Gateway-Secret", required = false) String headerSecret,
            @RequestBody String body) {
        
        // Accept secret in body (matching Apps Script V8 requirements) or header
        boolean hasValidBodySecret = body != null && body.contains(expectedGatewaySecret);
        boolean hasValidHeaderSecret = headerSecret != null && headerSecret.equals(expectedGatewaySecret);

        if (!hasValidBodySecret && !hasValidHeaderSecret) {
            log.warn("Mock Apps Script gateway rejected invalid secret");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("status", "UNAUTHORIZED", "message", "Invalid gateway secret"));
        }

        log.info("Mock Apps Script Gateway received event: {}", body);
        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "synced_at", System.currentTimeMillis(),
                "sheet_mirror", "CSC2_MIRROR_SYNTHETIC"
        ));
    }
}
