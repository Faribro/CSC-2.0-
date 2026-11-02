package org.allianceindia.csc2.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.allianceindia.csc2.config.UserPrincipal;
import org.allianceindia.csc2.dto.DTOs;
import org.allianceindia.csc2.service.FollowUpService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class FollowUpController {

    private final FollowUpService followUpService;

    public FollowUpController(FollowUpService followUpService) {
        this.followUpService = followUpService;
    }

    @PostMapping("/contact-attempts")
    public ResponseEntity<DTOs.ActionReceipt> recordContactAttempt(
            @RequestBody DTOs.RecordContactAttemptRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal user,
            HttpServletRequest httpRequest) {
        DTOs.ActionReceipt receipt = followUpService.recordContactAttempt(
                request, user, idempotencyKey, httpRequest.getRemoteAddr()
        );
        return ResponseEntity.ok(receipt);
    }

    @PostMapping("/encounters")
    public ResponseEntity<DTOs.ActionReceipt> recordEncounter(
            @RequestBody DTOs.RecordEncounterRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal user,
            HttpServletRequest httpRequest) {
        DTOs.ActionReceipt receipt = followUpService.recordEncounter(
                request, user, idempotencyKey, httpRequest.getRemoteAddr()
        );
        return ResponseEntity.ok(receipt);
    }

    @PostMapping("/planned-services")
    public ResponseEntity<DTOs.ActionReceipt> recordPlannedService(
            @RequestBody DTOs.RecordPlannedServiceRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal user,
            HttpServletRequest httpRequest) {
        DTOs.ActionReceipt receipt = followUpService.recordPlannedService(
                request, user, idempotencyKey, httpRequest.getRemoteAddr()
        );
        return ResponseEntity.ok(receipt);
    }

    @PostMapping("/delivered-services")
    public ResponseEntity<DTOs.ActionReceipt> recordDeliveredService(
            @RequestBody DTOs.RecordDeliveredServiceRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal user,
            HttpServletRequest httpRequest) {
        DTOs.ActionReceipt receipt = followUpService.recordDeliveredService(
                request, user, idempotencyKey, httpRequest.getRemoteAddr()
        );
        return ResponseEntity.ok(receipt);
    }
}
