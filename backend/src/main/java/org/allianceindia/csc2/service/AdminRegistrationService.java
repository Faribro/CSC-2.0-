package org.allianceindia.csc2.service;

import org.allianceindia.csc2.domain.AppUser;
import org.allianceindia.csc2.domain.AuditEvent;
import org.allianceindia.csc2.domain.StateRegistration;
import org.allianceindia.csc2.repository.AppUserRepository;
import org.allianceindia.csc2.repository.AuditEventRepository;
import org.allianceindia.csc2.repository.StateRegistrationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AdminRegistrationService {

    private final StateRegistrationRepository registrationRepository;
    private final AppUserRepository appUserRepository;
    private final NotificationService notificationService;
    private final AuditEventRepository auditEventRepository;

    public AdminRegistrationService(
            StateRegistrationRepository registrationRepository,
            AppUserRepository appUserRepository,
            NotificationService notificationService,
            AuditEventRepository auditEventRepository) {
        this.registrationRepository = registrationRepository;
        this.appUserRepository = appUserRepository;
        this.notificationService = notificationService;
        this.auditEventRepository = auditEventRepository;
    }

    public record RegistrationDetail(
            UUID id,
            String firstName,
            String lastName,
            String workEmail,
            String requestedState,
            String organization,
            String status,
            Instant emailVerifiedAt,
            Instant approvedAt,
            String approvedBy,
            String notes,
            Instant createdAt
    ) {}

    @Transactional(readOnly = true)
    public List<RegistrationDetail> listPendingRegistrations() {
        return registrationRepository.findAll().stream()
                .map(r -> new RegistrationDetail(
                        r.getId(),
                        r.getFirstName(),
                        r.getLastName(),
                        r.getWorkEmail(),
                        r.getRequestedState(),
                        r.getOrganization(),
                        r.getStatus(),
                        r.getEmailVerifiedAt(),
                        r.getApprovedAt(),
                        r.getApprovedBy(),
                        r.getNotes(),
                        r.getCreatedAt()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public RegistrationDetail getRegistrationById(UUID id) {
        StateRegistration r = registrationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Registration not found"));
        return new RegistrationDetail(
                r.getId(),
                r.getFirstName(),
                r.getLastName(),
                r.getWorkEmail(),
                r.getRequestedState(),
                r.getOrganization(),
                r.getStatus(),
                r.getEmailVerifiedAt(),
                r.getApprovedAt(),
                r.getApprovedBy(),
                r.getNotes(),
                r.getCreatedAt()
        );
    }

    @Transactional
    public RegistrationDetail approveRegistration(UUID id, String adminUsername, String clientIp) {
        StateRegistration reg = registrationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Registration not found"));

        if ("APPROVED".equals(reg.getStatus())) {
            return getRegistrationById(id);
        }

        reg.setStatus("APPROVED");
        reg.setApprovedAt(Instant.now());
        reg.setApprovedBy(adminUsername);
        registrationRepository.save(reg);

        // Provision or update AppUser
        AppUser user = appUserRepository.findByEmailIgnoreCase(reg.getWorkEmail())
                .orElseGet(() -> new AppUser(
                        reg.getWorkEmail(),
                        reg.getWorkEmail(),
                        reg.getFirstName(),
                        reg.getLastName(),
                        "STATE_REVIEWER",
                        reg.getRequestedState()
                ));
        user.setRole("STATE_REVIEWER");
        user.setState(reg.getRequestedState());
        appUserRepository.save(user);

        // Immutable audit log
        AuditEvent audit = new AuditEvent(
                null, adminUsername, reg.getRequestedState(),
                "STATE_REGISTRATION_APPROVED", "STATE_REGISTRATION", reg.getId(),
                clientIp, "{\"approvedBy\":\"" + adminUsername + "\",\"email\":\"" + reg.getWorkEmail() + "\"}"
        );
        auditEventRepository.save(audit);

        // Enqueue applicant notification
        Map<String, Object> payload = Map.of(
                "firstName", reg.getFirstName(),
                "state", reg.getRequestedState()
        );
        notificationService.enqueueEmail(reg.getWorkEmail(), "APPLICANT_APPROVED", payload);
        notificationService.processPendingNotifications();

        return getRegistrationById(id);
    }

    @Transactional
    public RegistrationDetail rejectRegistration(UUID id, String adminUsername, String reason, String clientIp) {
        StateRegistration reg = registrationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Registration not found"));

        reg.setStatus("REJECTED");
        reg.setApprovedBy(adminUsername);
        reg.setNotes(reason);
        reg = registrationRepository.save(reg);

        // Immutable audit log
        AuditEvent audit = new AuditEvent(
                null, adminUsername, reg.getRequestedState(),
                "STATE_REGISTRATION_REJECTED", "STATE_REGISTRATION", reg.getId(),
                clientIp, "{\"rejectedBy\":\"" + adminUsername + "\",\"reason\":\"" + (reason != null ? reason : "") + "\"}"
        );
        auditEventRepository.save(audit);

        // Enqueue applicant notification
        Map<String, Object> payload = Map.of(
                "firstName", reg.getFirstName(),
                "reason", reason != null ? reason : "Administrative policy requirements not met"
        );
        notificationService.enqueueEmail(reg.getWorkEmail(), "APPLICANT_REJECTED", payload);
        notificationService.processPendingNotifications();

        return getRegistrationById(id);
    }
}
