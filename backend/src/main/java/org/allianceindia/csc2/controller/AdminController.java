package org.allianceindia.csc2.controller;

import org.allianceindia.csc2.config.UserPrincipal;
import org.allianceindia.csc2.domain.AuditEvent;
import org.allianceindia.csc2.domain.OutboxEvent;
import org.allianceindia.csc2.repository.AuditEventRepository;
import org.allianceindia.csc2.repository.OutboxRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {

    private final OutboxRepository outboxRepository;
    private final AuditEventRepository auditEventRepository;

    public AdminController(OutboxRepository outboxRepository,
                           AuditEventRepository auditEventRepository) {
        this.outboxRepository = outboxRepository;
        this.auditEventRepository = auditEventRepository;
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getAdminStatus(@AuthenticationPrincipal UserPrincipal user) {
        if (!"administrator".equalsIgnoreCase(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Administrator role required for system operations");
        }

        long pendingOutbox = outboxRepository.findByStatus("PENDING").size();
        long failedOutbox = outboxRepository.findByStatus("FAILED").size();
        long publishedOutbox = outboxRepository.findByStatus("PUBLISHED").size();

        List<OutboxEvent> recentOutbox = outboxRepository.findAll(
                PageRequest.of(0, 15, Sort.by(Sort.Direction.DESC, "createdAt"))
        ).getContent();

        List<AuditEvent> recentAudits = auditEventRepository.findAll(
                PageRequest.of(0, 15, Sort.by(Sort.Direction.DESC, "occurredAt"))
        ).getContent();

        Map<String, Object> response = new HashMap<>();
        response.put("sheetsDeploymentId", "AKfycbwDZRDCm5TgOAL4wVkGgLBkxQtthZYBzkUTd_M3PNrSF_srx0a78rcEuSU7byHqp7AjnQ");
        response.put("sheetsSpreadsheetId", "1onMDhrdr5c8fcBRsvtelN_vGQ0R8W8zMFeOU0pxEHVM");
        response.put("sheetsMirrorStatus", "ACTIVE_MONITORED");
        response.put("outboxPending", pendingOutbox);
        response.put("outboxFailed", failedOutbox);
        response.put("outboxPublished", publishedOutbox);
        response.put("recentOutbox", recentOutbox);
        response.put("recentAudits", recentAudits);

        return ResponseEntity.ok(response);
    }
}
