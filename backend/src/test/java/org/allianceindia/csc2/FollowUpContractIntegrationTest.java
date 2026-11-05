package org.allianceindia.csc2;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.allianceindia.csc2.config.UserPrincipal;
import org.allianceindia.csc2.domain.*;
import org.allianceindia.csc2.dto.DTOs;
import org.allianceindia.csc2.repository.*;
import org.allianceindia.csc2.service.FollowUpService;
import org.allianceindia.csc2.service.WorklistService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
public class FollowUpContractIntegrationTest {

    @Autowired
    private FollowUpService followUpService;

    @Autowired
    private WorklistService worklistService;

    @Autowired
    private ActorRepository actorRepository;

    @Autowired
    private ScopeAssignmentRepository scopeAssignmentRepository;

    @Autowired
    private ClientRepository clientRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private ContactAttemptRepository contactAttemptRepository;

    @Autowired
    private EncounterRepository encounterRepository;

    @Autowired
    private PlannedServiceRepository plannedServiceRepository;

    @Autowired
    private DeliveredServiceRepository deliveredServiceRepository;

    @Autowired
    private AuditEventRepository auditEventRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    private Client testClient;
    private Task testTask1;
    private Task testTask2;
    private Actor actorA;
    private Actor actorB;
    private UserPrincipal workerA;
    private UserPrincipal workerB;

    @BeforeEach
    void setUp() {
        String uidA = UUID.randomUUID().toString().substring(0, 6);
        String uidB = UUID.randomUUID().toString().substring(0, 6);

        actorA = new Actor("ACT-A-" + uidA, "worker_a_" + uidA, passwordEncoder.encode("SecretPass123"), "Caseworker A", UserRole.FIELD_WORKER);
        actorRepository.save(actorA);
        scopeAssignmentRepository.save(new ScopeAssignment(actorA, "CENTER_DELHI_01", "Central Delhi", "Delhi"));

        actorB = new Actor("ACT-B-" + uidB, "worker_b_" + uidB, passwordEncoder.encode("SecretPass123"), "Caseworker B", UserRole.FIELD_WORKER);
        actorRepository.save(actorB);
        scopeAssignmentRepository.save(new ScopeAssignment(actorB, "CENTER_DELHI_01", "Central Delhi", "Delhi"));

        workerA = new UserPrincipal(actorA.getId(), actorA.getUsername(), "FIELD_USER", List.of("CENTER_DELHI_01"));
        workerB = new UserPrincipal(actorB.getId(), actorB.getUsername(), "FIELD_USER", List.of("CENTER_DELHI_01"));

        testClient = new Client();
        testClient.setClientRef("CRF-TEST-" + UUID.randomUUID().toString().substring(0, 6));
        testClient.setCenterId("CENTER_DELHI_01");
        testClient.setFullName("Aarav Sharma");
        testClient.setAge(32);
        testClient.setGender("male");
        testClient.setClientType("1");
        testClient.setRegistrationDate(LocalDate.now());
        testClient.setPrimaryPhone("+919876543210");
        testClient.setAssignedWorkerId(actorA.getId());
        testClient.setStatus("ACTIVE");
        clientRepository.save(testClient);

        testTask1 = new Task(
                "TSK-" + UUID.randomUUID().toString().substring(0, 8),
                testClient,
                actorA.getId(),
                "CENTER_DELHI_01",
                "1",
                "Routine ART adherence counseling",
                LocalDate.now()
        );
        taskRepository.save(testTask1);

        testTask2 = new Task(
                "TSK-" + UUID.randomUUID().toString().substring(0, 8),
                testClient,
                actorA.getId(),
                "CENTER_DELHI_01",
                "3",
                "Nutrition and viral load check",
                LocalDate.now().plusWeeks(2)
        );
        taskRepository.save(testTask2);
    }

    @Test
    @DisplayName("1. Contract: Contact attempt records outcome and keeps task open (never closes it)")
    void testContactAttemptKeepsTaskOpen() {
        DTOs.RecordContactAttemptRequest req = new DTOs.RecordContactAttemptRequest(
                testTask1.getId(),
                testClient.getId(),
                LocalDate.now(),
                "PHONE",
                "no_answer",
                "Called 3 times, rang continuously but not answered",
                testTask1.getVersion()
        );

        DTOs.ActionReceipt receipt = followUpService.recordContactAttempt(req, workerA, "idem-att-" + UUID.randomUUID(), "127.0.0.1");
        assertThat(receipt.status()).isEqualTo("SUCCESS");

        Task reloaded = taskRepository.findById(testTask1.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isIn("PENDING", "DUE", "OVERDUE");
        assertThat(reloaded.getStatus()).isNotEqualTo("COMPLETED");

        List<ContactAttempt> attempts = contactAttemptRepository.findByTaskIdOrderByAttemptDateDesc(testTask1.getId());
        assertThat(attempts).hasSize(1);
        assertThat(attempts.get(0).getOutcome()).isEqualTo("no_answer");
    }

    @Test
    @DisplayName("2. Contract: Complete closes ONLY that task; closing one task never closes others")
    void testCompleteActionClosesOnlyThatTask() {
        DTOs.RecordEncounterRequest encReq = new DTOs.RecordEncounterRequest(
                testClient.getId(),
                testTask1.getId(),
                LocalDate.now(),
                "HOME_VISIT",
                "GOOD",
                "NORMAL",
                "Home visit completed successfully, medicines sighted",
                480,
                0,
                "COMPLETE",
                testTask1.getVersion()
        );

        DTOs.ActionReceipt receipt = followUpService.recordEncounter(encReq, workerA, "idem-enc-" + UUID.randomUUID(), "127.0.0.1");
        assertThat(receipt.status()).isEqualTo("SUCCESS");

        // Task 1 should be COMPLETED
        Task completedTask = taskRepository.findById(testTask1.getId()).orElseThrow();
        assertThat(completedTask.getStatus()).isEqualTo("COMPLETED");
        assertThat(completedTask.getCompletedBy()).isEqualTo(workerA.getId());

        // Task 2 should remain OPEN (PENDING/DUE)
        Task siblingTask = taskRepository.findById(testTask2.getId()).orElseThrow();
        assertThat(siblingTask.getStatus()).isEqualTo("PENDING");
    }

    @Test
    @DisplayName("3. Contract: Reschedule records previous date, new date, and mandatory reason in AuditEvent")
    void testRescheduleKeepsHistoryAndAuditTrail() {
        LocalDate originalDueDate = testTask1.getDueDate();
        LocalDate newDueDate = originalDueDate.plusWeeks(2);

        DTOs.RescheduleTaskRequest reschedReq = new DTOs.RescheduleTaskRequest(
                newDueDate,
                "Client traveling out of station for family wedding",
                testTask1.getVersion()
        );

        DTOs.ActionReceipt receipt = followUpService.rescheduleTask(testTask1.getId(), reschedReq, workerA, "idem-resched-" + UUID.randomUUID(), "127.0.0.1");
        assertThat(receipt.status()).isEqualTo("SUCCESS");

        Task updatedTask = taskRepository.findById(testTask1.getId()).orElseThrow();
        assertThat(updatedTask.getDueDate()).isEqualTo(newDueDate);

        List<AuditEvent> audits = auditEventRepository.findByResourceIdAndAction(testTask1.getId(), "TASK_RESCHEDULED");
        assertThat(audits).isNotEmpty();
        assertThat(audits.get(0).getPayload()).contains(originalDueDate.toString());
        assertThat(audits.get(0).getPayload()).contains(newDueDate.toString());
        assertThat(audits.get(0).getPayload()).contains("Client traveling out of station");
    }

    @Test
    @DisplayName("4. Contract: Planned service stays PLANNED until an explicit delivered service record exists")
    void testPlannedVsDeliveredRules() {
        DTOs.RecordPlannedServiceRequest planReq = new DTOs.RecordPlannedServiceRequest(
                testClient.getId(),
                testTask1.getId(),
                "1",
                "cc",
                "ART_ADHERENCE",
                "Monthly ART counseling",
                LocalDate.now().plusMonths(1),
                "Planned 30-day pill count check"
        );

        DTOs.ActionReceipt planReceipt = followUpService.recordPlannedService(planReq, workerA, "idem-plan-" + UUID.randomUUID(), "127.0.0.1");
        assertThat(planReceipt.status()).isEqualTo("SUCCESS");

        PlannedService planned = plannedServiceRepository.findById(planReceipt.resourceId()).orElseThrow();
        assertThat(planned.getStatus()).isEqualTo("PLANNED");

        // Now record delivery
        DTOs.RecordDeliveredServiceRequest delivReq = new DTOs.RecordDeliveredServiceRequest(
                testClient.getId(),
                planned.getId(),
                testTask1.getId(),
                LocalDate.now(),
                "ART_ADHERENCE",
                "LNJP Hospital ART Centre",
                "Delivered monthly pill count and adherence guidance",
                planned.getVersion()
        );

        DTOs.ActionReceipt delivReceipt = followUpService.recordDeliveredService(delivReq, workerA, "idem-deliv-" + UUID.randomUUID(), "127.0.0.1");
        assertThat(delivReceipt.status()).isEqualTo("SUCCESS");

        PlannedService reloadedPlanned = plannedServiceRepository.findById(planned.getId()).orElseThrow();
        assertThat(reloadedPlanned.getStatus()).isEqualTo("DELIVERED");
    }

    @Test
    @DisplayName("5. Contract: Field worker ownership scope; accessing another user's task returns 404")
    void testFieldUserOwnershipScopeAnd404OutsideScope() {
        // Worker A owns testTask1. Worker B attempts to record an attempt on testTask1.
        DTOs.RecordContactAttemptRequest req = new DTOs.RecordContactAttemptRequest(
                testTask1.getId(),
                testClient.getId(),
                LocalDate.now(),
                "PHONE",
                "switched_off",
                "Attempted call by unauthorized worker",
                testTask1.getVersion()
        );

        assertThatThrownBy(() -> followUpService.recordContactAttempt(req, workerB, "idem-fail-01", "127.0.0.1"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404 NOT_FOUND");
    }

    @Test
    @DisplayName("6. Contract: Duplicate submit with same Idempotency-Key returns identical receipt")
    void testDuplicateSubmitWithSameKeyReturnsIdenticalResult() {
        String key = "idem-test-duplicate-key-" + UUID.randomUUID();
        DTOs.RecordContactAttemptRequest req = new DTOs.RecordContactAttemptRequest(
                testTask1.getId(),
                testClient.getId(),
                LocalDate.now(),
                "PHONE",
                "refused",
                "Client declined call at this moment",
                testTask1.getVersion()
        );

        DTOs.ActionReceipt receipt1 = followUpService.recordContactAttempt(req, workerA, key, "127.0.0.1");
        DTOs.ActionReceipt receipt2 = followUpService.recordContactAttempt(req, workerA, key, "127.0.0.1");

        assertThat(receipt1.status()).isEqualTo("SUCCESS");
        assertThat(receipt2.status()).isEqualTo("SUCCESS");
        assertThat(receipt1.resourceId()).isEqualTo(receipt2.resourceId());

        // Contact attempts count must be exactly 1
        List<ContactAttempt> attempts = contactAttemptRepository.findByTaskIdOrderByAttemptDateDesc(testTask1.getId());
        assertThat(attempts).hasSize(1);
    }

    @Test
    @DisplayName("7. Contract: Optimistic lock guard returns 409 Conflict on concurrent version mismatch")
    void testVersionConflictOnConcurrentReschedule() {
        int staleVersion = testTask1.getVersion() - 1; // Stale version
        DTOs.RescheduleTaskRequest reschedReq = new DTOs.RescheduleTaskRequest(
                LocalDate.now().plusWeeks(3),
                "Concurrent reschedule attempt",
                staleVersion
        );

        assertThatThrownBy(() -> followUpService.rescheduleTask(testTask1.getId(), reschedReq, workerA, "idem-conf-" + UUID.randomUUID(), "127.0.0.1"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("409 CONFLICT");
    }
}
