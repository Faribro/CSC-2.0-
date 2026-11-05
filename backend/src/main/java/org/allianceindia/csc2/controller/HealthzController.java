package org.allianceindia.csc2.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Minimal public health check endpoint that returns HTTP 200 with no sensitive data.
 * Ideal for Render keep-alive and cloud load-balancer probes.
 */
@RestController
public class HealthzController {

    @GetMapping("/healthz")
    public ResponseEntity<Void> healthz() {
        return ResponseEntity.ok().build();
    }
}
