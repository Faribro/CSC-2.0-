package org.allianceindia.csc2.controller;

import org.allianceindia.csc2.domain.FieldRoster;
import org.allianceindia.csc2.domain.NotificationOutbox;
import org.allianceindia.csc2.domain.SmsOutbox;
import org.allianceindia.csc2.repository.*;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * DEV-ONLY Sink Controller.
 * Exposes local SMS and Notification (Email) outbox queues exclusively for development and automated testing.
 * Strictly forbidden and unmapped in production profiles.
 */
@RestController
@RequestMapping("/api/v1/dev-sinks")
@Profile({"local", "dev", "test", "default"})
public class DevSinkController {

    private final SmsOutboxRepository smsOutboxRepository;
    private final NotificationOutboxRepository notificationOutboxRepository;
    private final AuthRateLimitRepository authRateLimitRepository;
    private final PhoneOtpChallengeRepository phoneOtpChallengeRepository;
    private final FieldRosterRepository fieldRosterRepository;
    private final Environment environment;

    public DevSinkController(
            SmsOutboxRepository smsOutboxRepository,
            NotificationOutboxRepository notificationOutboxRepository,
            AuthRateLimitRepository authRateLimitRepository,
            PhoneOtpChallengeRepository phoneOtpChallengeRepository,
            FieldRosterRepository fieldRosterRepository,
            Environment environment) {
        this.smsOutboxRepository = smsOutboxRepository;
        this.notificationOutboxRepository = notificationOutboxRepository;
        this.authRateLimitRepository = authRateLimitRepository;
        this.phoneOtpChallengeRepository = phoneOtpChallengeRepository;
        this.fieldRosterRepository = fieldRosterRepository;
        this.environment = environment;
    }

    private void ensureNotProduction() {
        List<String> active = Arrays.asList(environment.getActiveProfiles());
        if (active.contains("prod") || active.contains("production") || active.contains("staging")) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Dev sinks are disabled in production.");
        }
    }

    @GetMapping("/sms")
    public ResponseEntity<List<SmsOutbox>> getRecentSms(
            @RequestParam(defaultValue = "50") int limit) {
        ensureNotProduction();
        int safeLimit = Math.min(Math.max(1, limit), 100);
        List<SmsOutbox> results = smsOutboxRepository.findAll(
                PageRequest.of(0, safeLimit, org.springframework.data.domain.Sort.by(
                        org.springframework.data.domain.Sort.Direction.DESC, "createdAt"
                ))
        ).getContent();
        return ResponseEntity.ok(results);
    }

    @GetMapping("/email")
    public ResponseEntity<List<NotificationOutbox>> getRecentEmails(
            @RequestParam(defaultValue = "50") int limit) {
        ensureNotProduction();
        int safeLimit = Math.min(Math.max(1, limit), 100);
        List<NotificationOutbox> results = notificationOutboxRepository.findAll(
                PageRequest.of(0, safeLimit, org.springframework.data.domain.Sort.by(
                        org.springframework.data.domain.Sort.Direction.DESC, "createdAt"
                ))
        ).getContent();
        return ResponseEntity.ok(results);
    }

    @PostMapping("/clear")
    public ResponseEntity<Map<String, String>> clearSinks() {
        ensureNotProduction();
        smsOutboxRepository.deleteAll();
        notificationOutboxRepository.deleteAll();
        authRateLimitRepository.deleteAll();
        phoneOtpChallengeRepository.deleteAll();
        return ResponseEntity.ok(Map.of("status", "CLEARED", "message", "Local dev sinks and rate limits cleared successfully."));
    }

    @PostMapping("/roster")
    public ResponseEntity<Map<String, Object>> enrollRoster(@RequestBody Map<String, String> body) {
        ensureNotProduction();
        String phone = body.get("phone");
        String state = body.getOrDefault("state", "Maharashtra");
        String district = body.getOrDefault("district", "Mumbai");
        String status = body.getOrDefault("status", "ACTIVE");
        fieldRosterRepository.findByPhoneE164(phone).ifPresent(fieldRosterRepository::delete);
        FieldRoster entry = new FieldRoster(phone, state, district, "dev-admin");
        entry.setStatus(status);
        entry = fieldRosterRepository.save(entry);
        return ResponseEntity.ok(Map.of("status", "SAVED", "phone", entry.getPhoneE164(), "rosterStatus", entry.getStatus()));
    }
}
