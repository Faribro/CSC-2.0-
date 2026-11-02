package org.allianceindia.csc2;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.allianceindia.csc2.config.JwtTokenProvider;
import org.allianceindia.csc2.domain.*;
import org.allianceindia.csc2.dto.DTOs;
import org.allianceindia.csc2.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class CscVs1IntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtTokenProvider jwtTokenProvider;

    @Autowired private ActorRepository actorRepository;
    @Autowired private ScopeAssignmentRepository scopeAssignmentRepository;
    @Autowired private ClientRepository clientRepository;
    @Autowired private TaskRepository taskRepository;
    @Autowired private ContactAttemptRepository contactAttemptRepository;
    @Autowired private EncounterRepository encounterRepository;
    @Autowired private PlannedServiceRepository plannedServiceRepository;
    @Autowired private DeliveredServiceRepository deliveredServiceRepository;
    @Autowired private AuditEventRepository auditEventRepository;
    @Autowired private OutboxRepository outboxRepository;
    @Autowired private IdempotencyReceiptRepository idempotencyReceiptRepository;

    private Actor workerDelhi;
    private Actor workerMumbai;
    private Client clientDelhi;
    private Client clientMumbai;
    private Task taskDelhi;
    private String jwtDelhi;
    private String jwtMumbai;

    @BeforeEach
    void setUp() {
        // Clean database in reverse foreign key order
        idempotencyReceiptRepository.deleteAll();
        outboxRepository.deleteAll();
        auditEventRepository.deleteAll();
        deliveredServiceRepository.deleteAll();
        plannedServiceRepository.deleteAll();
        encounterRepository.deleteAll();
        contactAttemptRepository.deleteAll();
        taskRepository.deleteAll();
        clientRepository.deleteAll();
        scopeAssignmentRepository.deleteAll();
        actorRepository.deleteAll();

        // Seed Actors
        workerDelhi = new Actor("ACT-DL-01", "worker_delhi", passwordEncoder.encode("SecretPass123"), "Sunita Sharma", "OUTREACH_WORKER");
        actorRepository.save(workerDelhi);

        workerMumbai = new Actor("ACT-MB-01", "worker_mumbai", passwordEncoder.encode("SecretPass123"), "Ramesh Patil", "OUTREACH_WORKER");
        actorRepository.save(workerMumbai);

        // Scope Assignments
        scopeAssignmentRepository.save(new ScopeAssignment(workerDelhi, "CENTER_DELHI_01", "Central Delhi", "Delhi"));
        scopeAssignmentRepository.save(new ScopeAssignment(workerMumbai, "CENTER_MUMBAI_01", "Mumbai Suburban", "Maharashtra"));

        // Clients
        clientDelhi = new Client();
        clientDelhi.setClientRef("CSC-DL-0001");
        clientDelhi.setCenterId("CENTER_DELHI_01");
        clientDelhi.setAssignedWorkerId(workerDelhi.getId());
        clientDelhi.setRegistrationDate(LocalDate.now().minusMonths(1));
        clientDelhi.setClientType("2"); // Follow-up
        clientDelhi.setFullName("Synthetic Beneficiary Delhi");
        clientDelhi.setAge(28);
        clientDelhi.setGender("female");
        clientDelhi.setHivStatus("positive");
        clientDelhi.setArtNumber("ART-DL-9988");
        clientDelhi.setHasHivDocDeclaration(true);
        clientDelhi.setHasArtDocDeclaration(true);
        clientDelhi.setHomeVisitConsent(true);
        clientRepository.save(clientDelhi);

        clientMumbai = new Client();
        clientMumbai.setClientRef("CSC-MB-0001");
        clientMumbai.setCenterId("CENTER_MUMBAI_01");
        clientMumbai.setAssignedWorkerId(workerMumbai.getId());
        clientMumbai.setRegistrationDate(LocalDate.now().minusMonths(2));
        clientMumbai.setClientType("1"); // New
        clientMumbai.setFullName("Synthetic Beneficiary Mumbai");
        clientMumbai.setAge(34);
        clientMumbai.setGender("male");
        clientMumbai.setHivStatus("positive");
        clientMumbai.setArtNumber("ART-MB-4433");
        clientMumbai.setHomeVisitConsent(false);
        clientRepository.save(clientMumbai);

        // Task for Delhi client
        taskDelhi = new Task("TSK-DL-1001", clientDelhi, workerDelhi.getId(), "CENTER_DELHI_01", "FOLLOW_UP_VISIT", "Monthly Follow-Up Visit", LocalDate.now());
        taskRepository.save(taskDelhi);

        // JWT tokens
        jwtDelhi = jwtTokenProvider.generateToken(workerDelhi.getId(), workerDelhi.getUsername(), workerDelhi.getRole(), List.of("CENTER_DELHI_01"));
        jwtMumbai = jwtTokenProvider.generateToken(workerMumbai.getId(), workerMumbai.getUsername(), workerMumbai.getRole(), List.of("CENTER_MUMBAI_01"));
    }

    // 1. Unauthenticated Spring request returns 401
    @Test
    @DisplayName("Scenario 1: Unauthenticated request returns 401 Unauthorized")
    void testUnauthenticatedSpringRequestReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/work"))
                .andExpect(status().isUnauthorized());
    }

    // 2. Invalid service credential returns 401
    @Test
    @DisplayName("Scenario 2: Invalid service credential returns 401 Unauthorized")
    void testInvalidServiceCredentialReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/work")
                        .header("X-Service-Credential", "invalid_forged_token"))
                .andExpect(status().isUnauthorized());
    }

    // 3. Actuator Health endpoint responds with 200 OK
    @Test
    @DisplayName("Scenario 3: Actuator health responds 200 UP")
    void testHealthEndpointResponds200() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    // 4. Out-of-scope record returns 404
    @Test
    @DisplayName("Scenario 4: Out-of-scope record access returns 404 Not Found")
    void testOutOfScopeRecordReturns404() throws Exception {
        // Mumbai worker attempting to view Delhi client details
        mockMvc.perform(get("/api/v1/clients/" + clientDelhi.getId())
                        .header("Authorization", "Bearer " + jwtMumbai))
                .andExpect(status().isNotFound());
    }

    // 5. Authorized follow-up 200 with outbox + audit in same TX
    @Test
    @DisplayName("Scenario 5: Authorized follow-up records attempt with atomic audit and outbox")
    void testAuthorizedFollowUpReturns200WithOutboxAndAudit() throws Exception {
        DTOs.RecordContactAttemptRequest req = new DTOs.RecordContactAttemptRequest(
                taskDelhi.getId(), clientDelhi.getId(), LocalDate.now(), "PHONE", "reached", "Client confirmed ART adherence", taskDelhi.getVersion()
        );

        mockMvc.perform(post("/api/v1/contact-attempts")
                        .header("Authorization", "Bearer " + jwtDelhi)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"));

        // Verify Audit Event was recorded
        List<AuditEvent> auditLogs = auditEventRepository.findByActorIdOrderByOccurredAtDesc(workerDelhi.getId());
        assertThat(auditLogs).isNotEmpty();
        assertThat(auditLogs.get(0).getAction()).isEqualTo("CONTACT_ATTEMPT_RECORDED");

        // Verify Outbox Event was written
        List<OutboxEvent> outboxEvents = outboxRepository.findByAggregateIdOrderByCreatedAtDesc(taskDelhi.getId());
        assertThat(outboxEvents).isNotEmpty();
        assertThat(outboxEvents.get(0).getStatus()).isEqualTo("PENDING");
    }

    // 6. Attempt keeps task open (never changes status to DELIVERED)
    @Test
    @DisplayName("Scenario 6: Contact attempt keeps task open (status remains PENDING/DUE)")
    void testContactAttemptKeepsTaskOpen() throws Exception {
        DTOs.RecordContactAttemptRequest req = new DTOs.RecordContactAttemptRequest(
                taskDelhi.getId(), clientDelhi.getId(), LocalDate.now(), "PHONE", "reached", "Attempt succeeded", taskDelhi.getVersion()
        );

        mockMvc.perform(post("/api/v1/contact-attempts")
                        .header("Authorization", "Bearer " + jwtDelhi)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        Task refreshedTask = taskRepository.findById(taskDelhi.getId()).orElseThrow();
        assertThat(refreshedTask.getStatus()).isNotEqualTo("DELIVERED");
        assertThat(refreshedTask.getStatus()).isEqualTo("PENDING");
    }

    // 7. Completing a task completes that task ONLY
    @Test
    @DisplayName("Scenario 7: Completing a task completes that task only")
    void testCompletingTaskCompletesThatTaskOnly() throws Exception {
        // Create second task for the same client
        Task task2 = new Task("TSK-DL-1002", clientDelhi, workerDelhi.getId(), "CENTER_DELHI_01", "ART_REFILL_DUE", "ART Refill Due", LocalDate.now().plusDays(5));
        taskRepository.save(task2);

        DTOs.RecordEncounterRequest encReq = new DTOs.RecordEncounterRequest(
                clientDelhi.getId(), taskDelhi.getId(), LocalDate.now(), "HOME_VISIT", "Good", "Normal", "Routine follow up visit", 450, 0, taskDelhi.getVersion()
        );

        mockMvc.perform(post("/api/v1/encounters")
                        .header("Authorization", "Bearer " + jwtDelhi)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(encReq)))
                .andExpect(status().isOk());

        Task completedTask = taskRepository.findById(taskDelhi.getId()).orElseThrow();
        Task otherTask = taskRepository.findById(task2.getId()).orElseThrow();

        assertThat(completedTask.getStatus()).isEqualTo("DELIVERED");
        assertThat(otherTask.getStatus()).isEqualTo("PENDING"); // Other task remains untouched!
    }

    // 8. Idempotency replay returns identical receipt
    @Test
    @DisplayName("Scenario 8: Idempotency replay returns identical cached receipt")
    void testIdempotencyReplayIdentical() throws Exception {
        String idemKey = "idem-test-key-" + UUID.randomUUID();
        DTOs.RecordContactAttemptRequest req = new DTOs.RecordContactAttemptRequest(
                taskDelhi.getId(), clientDelhi.getId(), LocalDate.now(), "PHONE", "reached", "Idempotent call", taskDelhi.getVersion()
        );

        // First call
        String res1 = mockMvc.perform(post("/api/v1/contact-attempts")
                        .header("Authorization", "Bearer " + jwtDelhi)
                        .header("Idempotency-Key", idemKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        // Second call with same idempotency key
        String res2 = mockMvc.perform(post("/api/v1/contact-attempts")
                        .header("Authorization", "Bearer " + jwtDelhi)
                        .header("Idempotency-Key", idemKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(res1).isEqualTo(res2);

        // Verify only 1 contact attempt was created
        List<ContactAttempt> attempts = contactAttemptRepository.findByTaskIdOrderByAttemptDateDesc(taskDelhi.getId());
        assertThat(attempts).hasSize(1);
    }

    // 9. Version conflict returns 409
    @Test
    @DisplayName("Scenario 9: Version mismatch returns 409 Conflict")
    void testVersionConflictReturns409() throws Exception {
        // Send expected version 99 when actual version is 0
        DTOs.RecordContactAttemptRequest req = new DTOs.RecordContactAttemptRequest(
                taskDelhi.getId(), clientDelhi.getId(), LocalDate.now(), "PHONE", "reached", "Stale update", 99
        );

        mockMvc.perform(post("/api/v1/contact-attempts")
                        .header("Authorization", "Bearer " + jwtDelhi)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict());
    }

    // 10. Non-negotiable rule: Planned service becomes DELIVERED ONLY via DeliveredService record
    @Test
    @DisplayName("Scenario 10: Planned service transitions to DELIVERED only via explicit DeliveredService record")
    void testPlannedServiceTransitionsOnlyViaDeliveredService() throws Exception {
        // Step 1: Register planned service
        DTOs.RecordPlannedServiceRequest planReq = new DTOs.RecordPlannedServiceRequest(
                clientDelhi.getId(), taskDelhi.getId(), "ART_REFILL", "Monthly ART Dispensation", LocalDate.now().plusDays(3), "Planned refill"
        );

        String planResStr = mockMvc.perform(post("/api/v1/planned-services")
                        .header("Authorization", "Bearer " + jwtDelhi)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(planReq)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        DTOs.ActionReceipt planReceipt = objectMapper.readValue(planResStr, DTOs.ActionReceipt.class);
        UUID plannedServiceId = planReceipt.resourceId();

        // Check that PlannedService is currently PLANNED
        PlannedService planned = plannedServiceRepository.findById(plannedServiceId).orElseThrow();
        assertThat(planned.getStatus()).isEqualTo("PLANNED");

        // Step 2: Record explicit DeliveredService
        DTOs.RecordDeliveredServiceRequest delReq = new DTOs.RecordDeliveredServiceRequest(
                clientDelhi.getId(), plannedServiceId, taskDelhi.getId(), LocalDate.now(), "ART_REFILL", "Govt ART Center Delhi", "Dispensed 30 days refill", planned.getVersion()
        );

        mockMvc.perform(post("/api/v1/delivered-services")
                        .header("Authorization", "Bearer " + jwtDelhi)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(delReq)))
                .andExpect(status().isOk());

        // Now PlannedService status MUST be DELIVERED
        PlannedService updatedPlanned = plannedServiceRepository.findById(plannedServiceId).orElseThrow();
        assertThat(updatedPlanned.getStatus()).isEqualTo("DELIVERED");

        // And explicit DeliveredService record exists
        List<DeliveredService> delivered = deliveredServiceRepository.findByPlannedServiceId(plannedServiceId);
        assertThat(delivered).hasSize(1);
        assertThat(delivered.get(0).getServiceCode()).isEqualTo("ART_REFILL");
    }
}
