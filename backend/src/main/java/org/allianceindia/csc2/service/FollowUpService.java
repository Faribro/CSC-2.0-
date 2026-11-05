package org.allianceindia.csc2.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.allianceindia.csc2.config.UserPrincipal;
import org.allianceindia.csc2.domain.*;
import org.allianceindia.csc2.dto.DTOs;
import org.allianceindia.csc2.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

@Service
public class FollowUpService {

    private final TaskRepository taskRepository;
    private final ClientRepository clientRepository;
    private final ContactAttemptRepository contactAttemptRepository;
    private final EncounterRepository encounterRepository;
    private final ObservationRepository observationRepository;
    private final PlannedServiceRepository plannedServiceRepository;
    private final DeliveredServiceRepository deliveredServiceRepository;
    private final AuditEventRepository auditEventRepository;
    private final OutboxRepository outboxRepository;
    private final IdempotencyReceiptRepository idempotencyReceiptRepository;
    private final ObjectMapper objectMapper;

    public FollowUpService(TaskRepository taskRepository,
                           ClientRepository clientRepository,
                           ContactAttemptRepository contactAttemptRepository,
                           EncounterRepository encounterRepository,
                           ObservationRepository observationRepository,
                           PlannedServiceRepository plannedServiceRepository,
                           DeliveredServiceRepository deliveredServiceRepository,
                           AuditEventRepository auditEventRepository,
                           OutboxRepository outboxRepository,
                           IdempotencyReceiptRepository idempotencyReceiptRepository,
                           ObjectMapper objectMapper) {
        this.taskRepository = taskRepository;
        this.clientRepository = clientRepository;
        this.contactAttemptRepository = contactAttemptRepository;
        this.encounterRepository = encounterRepository;
        this.observationRepository = observationRepository;
        this.plannedServiceRepository = plannedServiceRepository;
        this.deliveredServiceRepository = deliveredServiceRepository;
        this.auditEventRepository = auditEventRepository;
        this.outboxRepository = outboxRepository;
        this.idempotencyReceiptRepository = idempotencyReceiptRepository;
        this.objectMapper = objectMapper;
    }

    private String computeHash(Object obj) {
        try {
            String json = objectMapper.writeValueAsString(obj);
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(json.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            return "hash-fallback-" + System.currentTimeMillis();
        }
    }

    private void validateTaskOwnership(Task task, UserPrincipal user) {
        if (user != null && ("FIELD_USER".equalsIgnoreCase(user.getRole()) || "OUTREACH_WORKER".equalsIgnoreCase(user.getRole()))) {
            boolean isAssigned = task.getAssignedWorkerId() != null && task.getAssignedWorkerId().equals(user.getId());
            boolean isCreator = task.getClient() != null && user.getId().equals(task.getClient().getFieldUserId());
            if (!isAssigned && !isCreator) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found or outside user ownership scope");
            }
        }
    }

    // 1. RECORD CONTACT ATTEMPT
    // Rules: attempt keeps the task open; contact attempt != encounter
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public DTOs.ActionReceipt recordContactAttempt(DTOs.RecordContactAttemptRequest req, UserPrincipal user, String idempotencyKey, String ipAddress) {
        // Idempotency check
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<IdempotencyReceipt> receipt = idempotencyReceiptRepository.findByIdempotencyKey(idempotencyKey);
            if (receipt.isPresent()) {
                if (!receipt.get().getRequestHash().equals(computeHash(req))) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Idempotency key reused with different payload");
                }
                return parseReceipt(receipt.get());
            }
        }

        // Authorize + lock task
        Task task = taskRepository.findByIdAndCenterIdInWithLock(req.taskId(), user.getAuthorizedCenters())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found or outside authorized center scope"));

        validateTaskOwnership(task, user);

        // Verify expected version (optimistic concurrency guard)
        if (req.expectedTaskVersion() != null && task.getVersion() != req.expectedTaskVersion()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Task version conflict: expected " + req.expectedTaskVersion() + " but was " + task.getVersion());
        }

        Client client = task.getClient();

        // Write domain row
        ContactAttempt attempt = new ContactAttempt(
                task,
                client,
                user.getId(),
                req.attemptDate() != null ? req.attemptDate() : LocalDate.now(),
                req.channel() != null ? req.channel() : "PHONE",
                req.outcome(),
                req.notes()
        );
        contactAttemptRepository.save(attempt);

        // NON-NEGOTIABLE RULE: Attempt keeps the task OPEN (never changes to DELIVERED)
        // Task remains PENDING / DUE / OVERDUE
        task.setUpdatedAt(Instant.now());
        taskRepository.save(task);

        // Audit Event in same TX
        String auditPayload = String.format("{\"channel\":\"%s\",\"outcome\":\"%s\",\"notes\":\"%s\"}", attempt.getChannel(), attempt.getOutcome(), attempt.getNotes() != null ? attempt.getNotes() : "");
        AuditEvent audit = new AuditEvent(
                user.getId(), user.getUsername(), task.getCenterId(),
                "CONTACT_ATTEMPT_RECORDED", "CONTACT_ATTEMPT", attempt.getId(),
                ipAddress, auditPayload
        );
        auditEventRepository.save(audit);

        // Outbox Event in same TX
        OutboxEvent outbox = new OutboxEvent(
                "CONTACT_ATTEMPTED", "TASK", task.getId(),
                String.format("{\"taskId\":\"%s\",\"clientId\":\"%s\",\"outcome\":\"%s\"}", task.getId(), client.getId(), attempt.getOutcome())
        );
        outboxRepository.save(outbox);

        DTOs.ActionReceipt receipt = new DTOs.ActionReceipt(
                idempotencyKey, "SUCCESS", "Contact attempt recorded. Task remains open.", attempt.getId(), task.getVersion()
        );

        // Store Idempotency Receipt
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            saveReceipt(idempotencyKey, user.getId(), "/api/v1/contact-attempts", computeHash(req), 200, receipt);
        }

        return receipt;
    }

    // 2. RECORD ENCOUNTER
    // Rules: observation date != recorded timestamp; encounter != referral completion
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public DTOs.ActionReceipt recordEncounter(DTOs.RecordEncounterRequest req, UserPrincipal user, String idempotencyKey, String ipAddress) {
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<IdempotencyReceipt> receipt = idempotencyReceiptRepository.findByIdempotencyKey(idempotencyKey);
            if (receipt.isPresent()) {
                if (!receipt.get().getRequestHash().equals(computeHash(req))) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Idempotency key reused with different payload");
                }
                return parseReceipt(receipt.get());
            }
        }

        Client client = clientRepository.findByIdAndCenterIdIn(req.clientId(), user.getAuthorizedCenters())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Client not found or outside authorized center scope"));

        Task task = null;
        if (req.taskId() != null) {
            task = taskRepository.findByIdAndCenterIdInWithLock(req.taskId(), user.getAuthorizedCenters())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found or outside authorized center scope"));

            validateTaskOwnership(task, user);

            if (req.expectedTaskVersion() != null && task.getVersion() != req.expectedTaskVersion()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Task version conflict: expected " + req.expectedTaskVersion() + " but was " + task.getVersion());
            }
        }

        // Observation date != recorded timestamp
        LocalDate obsDate = req.observationDate() != null ? req.observationDate() : LocalDate.now();
        Encounter encounter = new Encounter(client, user.getId(), task, obsDate, req.encounterType() != null ? req.encounterType() : "HOME_VISIT");
        encounter.setArtAdherenceAssessment(req.artAdherenceAssessment());
        encounter.setNutritionAssessment(req.nutritionAssessment());
        encounter.setGeneralNotes(req.generalNotes());
        encounterRepository.save(encounter);

        // Observations if provided
        if (req.cd4Count() != null) {
            Observation obs = new Observation(client, encounter, obsDate, "CD4_COUNT", BigDecimal.valueOf(req.cd4Count()), "cells/mm3");
            observationRepository.save(obs);
            client.setCd4Count(req.cd4Count());
        }
        if (req.viralLoadCount() != null) {
            Observation obs = new Observation(client, encounter, obsDate, "VIRAL_LOAD", BigDecimal.valueOf(req.viralLoadCount()), "copies/mL");
            observationRepository.save(obs);
            client.setViralLoadCount(req.viralLoadCount());
        }
        client.setUpdatedAt(Instant.now());
        clientRepository.save(client);

        // A task closes ONLY through an encounter with the explicit COMPLETE action.
        if (task != null && req.action() != null && req.action().equalsIgnoreCase("COMPLETE")) {
            task.setStatus("COMPLETED");
            task.setCompletedAt(Instant.now());
            task.setCompletedBy(user.getId());
            task.setUpdatedAt(Instant.now());
            taskRepository.save(task);
        }

        // Audit Event in same TX
        AuditEvent audit = new AuditEvent(
                user.getId(), user.getUsername(), client.getCenterId(),
                "ENCOUNTER_RECORDED", "ENCOUNTER", encounter.getId(),
                ipAddress, String.format("{\"observationDate\":\"%s\",\"type\":\"%s\"}", obsDate, encounter.getEncounterType())
        );
        auditEventRepository.save(audit);

        // Outbox Event in same TX
        OutboxEvent outbox = new OutboxEvent(
                "ENCOUNTER_RECORDED", "CLIENT", client.getId(),
                String.format("{\"encounterId\":\"%s\",\"clientId\":\"%s\",\"observationDate\":\"%s\"}", encounter.getId(), client.getId(), obsDate)
        );
        outboxRepository.save(outbox);

        DTOs.ActionReceipt receipt = new DTOs.ActionReceipt(
                idempotencyKey, "SUCCESS", "Encounter recorded successfully.", encounter.getId(), client.getVersion()
        );

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            saveReceipt(idempotencyKey, user.getId(), "/api/v1/encounters", computeHash(req), 200, receipt);
        }

        return receipt;
    }

    // 3. RECORD PLANNED SERVICE
    // Rules: Section J5 future service; planned service != delivered service
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public DTOs.ActionReceipt recordPlannedService(DTOs.RecordPlannedServiceRequest req, UserPrincipal user, String idempotencyKey, String ipAddress) {
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<IdempotencyReceipt> receipt = idempotencyReceiptRepository.findByIdempotencyKey(idempotencyKey);
            if (receipt.isPresent()) {
                if (!receipt.get().getRequestHash().equals(computeHash(req))) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Idempotency key reused with different payload");
                }
                return parseReceipt(receipt.get());
            }
        }

        Client client = clientRepository.findByIdAndCenterIdIn(req.clientId(), user.getAuthorizedCenters())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Client not found or outside authorized center scope"));

        Task task = null;
        if (req.taskId() != null) {
            task = taskRepository.findByIdAndCenterIdIn(req.taskId(), user.getAuthorizedCenters()).orElse(null);
        }

        PlannedService planned = new PlannedService(
                client, task, req.serviceCode() != null ? req.serviceCode() : "GENERAL_FOLLOWUP",
                req.serviceName() != null ? req.serviceName() : "Planned follow-up service",
                req.targetDueDate() != null ? req.targetDueDate() : LocalDate.now().plusWeeks(1),
                req.notes()
        );
        plannedServiceRepository.save(planned);

        // Rule: Next action creates a SEPARATE task; task reasons come from J5 purpose codes or admin labels
        Task nextTask = new Task(
                "TSK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                client,
                user.getId(),
                client.getCenterId(),
                req.purposeCode() != null ? req.purposeCode() : "1",
                req.serviceName() != null ? req.serviceName() : "Planned Follow-up Task",
                req.targetDueDate() != null ? req.targetDueDate() : LocalDate.now().plusWeeks(1)
        );
        taskRepository.save(nextTask);

        // Audit & Outbox in same TX
        AuditEvent audit = new AuditEvent(
                user.getId(), user.getUsername(), client.getCenterId(),
                "SERVICE_PLANNED", "PLANNED_SERVICE", planned.getId(),
                ipAddress, String.format("{\"serviceCode\":\"%s\",\"dueDate\":\"%s\"}", planned.getServiceCode(), planned.getTargetDueDate())
        );
        auditEventRepository.save(audit);

        OutboxEvent outbox = new OutboxEvent(
                "SERVICE_PLANNED", "CLIENT", client.getId(),
                String.format("{\"plannedServiceId\":\"%s\",\"serviceCode\":\"%s\"}", planned.getId(), planned.getServiceCode())
        );
        outboxRepository.save(outbox);

        DTOs.ActionReceipt receipt = new DTOs.ActionReceipt(
                idempotencyKey, "SUCCESS", "Planned service registered with status PLANNED.", planned.getId(), planned.getVersion()
        );

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            saveReceipt(idempotencyKey, user.getId(), "/api/v1/planned-services", computeHash(req), 200, receipt);
        }

        return receipt;
    }

    // 4. RECORD DELIVERED SERVICE
    // Rules: Planned service becomes DELIVERED ONLY via explicit DeliveredService record!
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public DTOs.ActionReceipt recordDeliveredService(DTOs.RecordDeliveredServiceRequest req, UserPrincipal user, String idempotencyKey, String ipAddress) {
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<IdempotencyReceipt> receipt = idempotencyReceiptRepository.findByIdempotencyKey(idempotencyKey);
            if (receipt.isPresent()) {
                if (!receipt.get().getRequestHash().equals(computeHash(req))) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Idempotency key reused with different payload");
                }
                return parseReceipt(receipt.get());
            }
        }

        Client client = clientRepository.findByIdAndCenterIdIn(req.clientId(), user.getAuthorizedCenters())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Client not found or outside authorized center scope"));

        PlannedService planned = null;
        if (req.plannedServiceId() != null) {
            planned = plannedServiceRepository.findByIdAndClientId(req.plannedServiceId(), client.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Planned service not found for client"));

            if (req.expectedPlannedServiceVersion() != null && planned.getVersion() != req.expectedPlannedServiceVersion()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Planned service version conflict: expected " + req.expectedPlannedServiceVersion() + " but was " + planned.getVersion());
            }

            // Explicitly transition status to DELIVERED
            planned.setStatus("DELIVERED");
            planned.setUpdatedAt(Instant.now());
            plannedServiceRepository.save(planned);
        }

        Task task = null;
        if (req.taskId() != null) {
            task = taskRepository.findByIdAndCenterIdInWithLock(req.taskId(), user.getAuthorizedCenters()).orElse(null);
            // Non-negotiable rule: Task closes ONLY via Encounter with explicit COMPLETE action;
            // Delivered service links to task for audit reference but does not alter task status.
        }

        DeliveredService delivered = new DeliveredService(
                planned, client, user.getId(), task,
                req.deliveryDate() != null ? req.deliveryDate() : LocalDate.now(),
                req.serviceCode(), req.facilityName(), req.notes()
        );
        deliveredServiceRepository.save(delivered);

        // Audit & Outbox in same TX
        AuditEvent audit = new AuditEvent(
                user.getId(), user.getUsername(), client.getCenterId(),
                "SERVICE_DELIVERED", "DELIVERED_SERVICE", delivered.getId(),
                ipAddress, String.format("{\"serviceCode\":\"%s\",\"facility\":\"%s\"}", delivered.getServiceCode(), delivered.getFacilityName())
        );
        auditEventRepository.save(audit);

        OutboxEvent outbox = new OutboxEvent(
                "SERVICE_DELIVERED", "CLIENT", client.getId(),
                String.format("{\"deliveredServiceId\":\"%s\",\"serviceCode\":\"%s\"}", delivered.getId(), delivered.getServiceCode())
        );
        outboxRepository.save(outbox);

        DTOs.ActionReceipt receipt = new DTOs.ActionReceipt(
                idempotencyKey, "SUCCESS", "Delivered service recorded. Planned service marked DELIVERED.", delivered.getId(), planned != null ? planned.getVersion() : 0
        );

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            saveReceipt(idempotencyKey, user.getId(), "/api/v1/delivered-services", computeHash(req), 200, receipt);
        }

        return receipt;
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public DTOs.ActionReceipt rescheduleTask(UUID taskId, DTOs.RescheduleTaskRequest req, UserPrincipal user, String idempotencyKey, String ipAddress) {
        if (req.reason() == null || req.reason().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reschedule reason is mandatory");
        }
        if (req.newDueDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New due date is mandatory");
        }
        Task task = taskRepository.findByIdAndCenterIdInWithLock(taskId, user.getAuthorizedCenters())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found or outside authorized center scope"));

        validateTaskOwnership(task, user);

        if (req.expectedTaskVersion() != null && task.getVersion() != req.expectedTaskVersion()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Task version conflict: expected " + req.expectedTaskVersion() + " but was " + task.getVersion());
        }

        LocalDate previousDueDate = task.getDueDate();
        task.setDueDate(req.newDueDate());
        task.setUpdatedAt(Instant.now());
        taskRepository.save(task);

        AuditEvent audit = new AuditEvent(
                user.getId(), user.getUsername(), task.getCenterId(),
                "TASK_RESCHEDULED", "TASK", task.getId(),
                ipAddress, String.format("{\"previousDueDate\":\"%s\",\"newDueDate\":\"%s\",\"reason\":\"%s\"}",
                previousDueDate, req.newDueDate(), req.reason().replace("\"", "\\\""))
        );
        auditEventRepository.save(audit);

        OutboxEvent outbox = new OutboxEvent(
                "TASK_RESCHEDULED", "TASK", task.getId(),
                String.format("{\"taskId\":\"%s\",\"newDueDate\":\"%s\",\"reason\":\"%s\"}",
                task.getId(), req.newDueDate(), req.reason().replace("\"", "\\\""))
        );
        outboxRepository.save(outbox);

        return new DTOs.ActionReceipt(idempotencyKey, "SUCCESS", "Task rescheduled successfully", task.getId(), task.getVersion());
    }

    @Transactional
    public DTOs.ActionReceipt correctRecord(DTOs.CorrectRecordRequest req, UserPrincipal user, String idempotencyKey, String ipAddress) {
        if (req.reason() == null || req.reason().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Correction reason is mandatory");
        }
        if (req.recordType() == null || req.recordId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Record type and ID are mandatory");
        }

        AuditEvent audit = new AuditEvent(
                user.getId(), user.getUsername(), "GLOBAL",
                "RECORD_CORRECTED", req.recordType(), req.recordId(),
                ipAddress, String.format("{\"fieldName\":\"%s\",\"newValue\":\"%s\",\"reason\":\"%s\"}",
                req.fieldName() != null ? req.fieldName().replace("\"", "\\\"") : "",
                req.newValue() != null ? req.newValue().replace("\"", "\\\"") : "",
                req.reason().replace("\"", "\\\""))
        );
        auditEventRepository.save(audit);

        OutboxEvent outbox = new OutboxEvent(
                "RECORD_CORRECTED", req.recordType(), req.recordId(),
                String.format("{\"recordId\":\"%s\",\"fieldName\":\"%s\",\"reason\":\"%s\"}",
                req.recordId(),
                req.fieldName() != null ? req.fieldName().replace("\"", "\\\"") : "",
                req.reason().replace("\"", "\\\""))
        );
        outboxRepository.save(outbox);

        return new DTOs.ActionReceipt(idempotencyKey, "SUCCESS", "Record correction logged in immutable audit trail", req.recordId(), 0);
    }

    private void saveReceipt(String key, UUID actorId, String endpoint, String hash, int status, DTOs.ActionReceipt receipt) {
        try {
            String body = objectMapper.writeValueAsString(receipt);
            IdempotencyReceipt r = new IdempotencyReceipt(key, actorId, endpoint, hash, status, body);
            idempotencyReceiptRepository.save(r);
        } catch (Exception ignored) {}
    }

    private DTOs.ActionReceipt parseReceipt(IdempotencyReceipt receipt) {
        try {
            return objectMapper.readValue(receipt.getResponseBody(), DTOs.ActionReceipt.class);
        } catch (JsonProcessingException e) {
            return new DTOs.ActionReceipt(receipt.getIdempotencyKey(), "SUCCESS", "Replayed idempotency receipt", null, 0);
        }
    }
}
