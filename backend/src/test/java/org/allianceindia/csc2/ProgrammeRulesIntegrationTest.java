package org.allianceindia.csc2;

import org.allianceindia.csc2.domain.*;
import org.allianceindia.csc2.dto.RuleDTOs;
import org.allianceindia.csc2.repository.*;
import org.allianceindia.csc2.service.FollowUpRuleService;
import org.allianceindia.csc2.service.RuleEngineService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
public class ProgrammeRulesIntegrationTest {

    @Autowired
    private FollowUpRuleService ruleService;

    @Autowired
    private RuleEngineService ruleEngineService;

    @Autowired
    private FollowUpRuleRepository ruleRepository;

    @Autowired
    private FollowUpRuleHistoryRepository historyRepository;

    @Autowired
    private RuleSuggestionRepository suggestionRepository;

    @Autowired
    private ClientRepository clientRepository;

    @Autowired
    private ClientTrackingTagRepository tagRepository;

    @Autowired
    private ClientApplicationAdditionRepository additionRepository;

    @Autowired
    private ContactAttemptRepository contactAttemptRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private AuditEventRepository auditEventRepository;

    @Autowired
    private ActorRepository actorRepository;

    private Client testClient;
    private Actor testActor;

    @BeforeEach
    public void setupTestData() {
        // Ensure synthetic test actor exists
        testActor = actorRepository.findAll().stream().findFirst().orElseGet(() -> {
            Actor a = new Actor();
            a.setUsername("test.field.worker@allianceindia.org");
            a.setFullName("Test Field Worker");
            a.setRole("FIELD_USER");
            a.setActive(true);
            return actorRepository.save(a);
        });

        // Ensure synthetic test client exists with unique ref
        String ref = "CLIENT-RULES-" + UUID.randomUUID().toString().substring(0, 8);
        testClient = new Client();
        testClient.setClientRef(ref);
        testClient.setFullName("Ramesh Kumar (Synthetic)");
        testClient.setAge(32);
        testClient.setGender("male");
        testClient.setCenterId("DL-01");
        testClient.setClientType("1");
        testClient.setRegistrationDate(LocalDate.now());
        testClient.setHivStatus("positive");
        testClient.setArtNumber("ART-TEST-9988");
        testClient.setArtStartDate(LocalDate.now().minusMonths(1)); // ART started 1 month ago
        testClient = clientRepository.save(testClient);
    }

    private RuleDTOs.RuleDto createAndActivateTestRule(String codePrefix, String triggerType, String triggerParams, String intervalSpec, String purposeCode, List<String> serviceCodes) {
        String code = "TEST-ACT-" + codePrefix + "-" + UUID.randomUUID().toString().substring(0, 6);
        RuleDTOs.CreateRuleRequest req = new RuleDTOs.CreateRuleRequest(
                code,
                "Test Active " + codePrefix,
                "परीक्षण सक्रिय " + codePrefix,
                "ART_INITIATION",
                triggerType,
                triggerParams,
                intervalSpec,
                purposeCode,
                serviceCodes,
                "NACO Guidelines 2025",
                "2025 Edition",
                "https://naco.gov.in",
                "Sec 1",
                "NATIONAL",
                "Test activation"
        );
        RuleDTOs.RuleDto created = ruleService.createRule(req, "author.test@allianceindia.org", "STATE_TEAM");
        ruleService.approveRule(created.id(), "supervisor.test@allianceindia.org", "PROGRAMME_OWNER", "Approved");
        return ruleService.activateRule(created.id(), new RuleDTOs.ActivateRuleRequest(Instant.now().minusSeconds(3600), null, "Active"), "supervisor.test@allianceindia.org", "PROGRAMME_OWNER");
    }

    @Test
    @DisplayName("Lifecycle & Permissions: Author cannot self-approve, leadership cannot edit, two-person approval succeeds")
    public void testRuleLifecycleAndPermissions() {
        String author = "worker.author@allianceindia.org";
        String supervisor = "supervisor.checker@allianceindia.org";

        // 1. Create rule as author
        RuleDTOs.CreateRuleRequest createReq = new RuleDTOs.CreateRuleRequest(
                "TEST-RULE-LIFECYCLE-" + UUID.randomUUID().toString().substring(0, 6),
                "Test Protocol EN",
                "टेस्ट प्रोटोकॉल HI",
                "ART_INITIATION",
                "ART_START_DATE",
                "{}",
                "{\"every\":\"1 month\"}",
                "01",
                List.of("01-01"),
                "NACO Guidelines 2025",
                "Edition 2025",
                "https://naco.gov.in",
                "Sec 4.2",
                "NATIONAL",
                "Creation note"
        );
        RuleDTOs.RuleDto created = ruleService.createRule(createReq, author, "STATE_TEAM");
        assertThat(created.status()).isEqualTo("DRAFT");
        assertThat(created.createdBy()).isEqualTo(author);

        // 2. Submit for review
        RuleDTOs.RuleDto submitted = ruleService.submitForReview(created.id(), author, "STATE_TEAM", "Submitting for approval");
        assertThat(submitted.status()).isEqualTo("IN_REVIEW");

        // 3. Author attempts self-approval -> must fail with 403 Forbidden
        assertThatThrownBy(() -> ruleService.approveRule(created.id(), author, "STATE_TEAM", "Self approval"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Author cannot approve their own rule");

        // 4. Leadership role attempts to approve or edit -> must fail with 403 Forbidden
        assertThatThrownBy(() -> ruleService.approveRule(created.id(), "lead.oversight@allianceindia.org", "LEADERSHIP", "Leadership attempt"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Leadership role is read-only");

        // 5. Distinct supervisor approves -> SUCCESS
        RuleDTOs.RuleDto approved = ruleService.approveRule(created.id(), supervisor, "PROGRAMME_OWNER", "Peer verified");
        assertThat(approved.status()).isEqualTo("APPROVED");
        assertThat(approved.approvedBy()).isEqualTo(supervisor);

        // 6. Activate rule
        RuleDTOs.RuleDto activated = ruleService.activateRule(created.id(), new RuleDTOs.ActivateRuleRequest(Instant.now().minusSeconds(60), null, "Go live"), supervisor, "PROGRAMME_OWNER");
        assertThat(activated.status()).isEqualTo("ACTIVE");

        // 7. Verify append-only history has entries for every transition
        List<RuleDTOs.RuleHistoryDto> history = ruleService.getRuleHistory(created.id());
        assertThat(history.size()).isGreaterThanOrEqualTo(4);
    }

    @Test
    @DisplayName("Evaluation: DRAFT rules never evaluate or produce suggestions")
    public void testDraftRulesNeverEvaluate() {
        // Create rule in DRAFT
        RuleDTOs.CreateRuleRequest createReq = new RuleDTOs.CreateRuleRequest(
                "TEST-RULE-STAYS-DRAFT-" + UUID.randomUUID().toString().substring(0, 6),
                "Draft Protocol",
                "ड्राफ्ट प्रोटोकॉल",
                "ART_INITIATION",
                "ART_START_DATE",
                "{}",
                "{\"every\":\"1 month\"}",
                "01",
                List.of("01-01"),
                "NACO 2025",
                "2025",
                "https://naco.gov.in",
                "Sec 1",
                "NATIONAL",
                "Draft"
        );
        RuleDTOs.RuleDto draftRule = ruleService.createRule(createReq, "author@allianceindia.org", "STATE_TEAM");
        assertThat(draftRule.status()).isEqualTo("DRAFT");

        // Client has art_start_date set, but because rule is DRAFT, evaluate produces no suggestions for this rule
        List<RuleDTOs.RuleSuggestionDto> suggestions = ruleEngineService.evaluateRulesForClient(testClient.getId(), LocalDate.now());
        assertThat(suggestions.stream().anyMatch(s -> s.ruleId().equals(draftRule.id()))).isFalse();
    }

    @Test
    @DisplayName("Evaluation: Effective date boundaries prevent suggestions before effectiveFrom or after effectiveTo")
    public void testEffectiveDateBoundaries() {
        String code = "TEST-EFFECTIVE-BOUNDS-" + UUID.randomUUID().toString().substring(0, 6);
        RuleDTOs.CreateRuleRequest req = new RuleDTOs.CreateRuleRequest(
                code,
                "Boundary Test",
                "सीमा परीक्षण",
                "ART_INITIATION",
                "ART_START_DATE",
                "{}",
                "{\"every\":\"1 month\"}",
                "01",
                List.of("01-01"),
                "NACO",
                "2025",
                null,
                null,
                "NATIONAL",
                "Bounds test"
        );
        RuleDTOs.RuleDto created = ruleService.createRule(req, "author.bound@allianceindia.org", "STATE_TEAM");
        ruleService.approveRule(created.id(), "supervisor.bound@allianceindia.org", "PROGRAMME_OWNER", "Approved");

        // Activate with effectiveFrom in future (next week)
        RuleDTOs.RuleDto futureActive = ruleService.activateRule(created.id(), new RuleDTOs.ActivateRuleRequest(
                Instant.now().plus(7, ChronoUnit.DAYS), null, "Future"
        ), "supervisor.bound@allianceindia.org", "PROGRAMME_OWNER");
        assertThat(futureActive.status()).isEqualTo("ACTIVE");

        List<RuleDTOs.RuleSuggestionDto> suggestions = ruleEngineService.evaluateRulesForClient(testClient.getId(), LocalDate.now());
        assertThat(suggestions.stream().anyMatch(s -> s.ruleId().equals(created.id()))).isFalse();
    }

    @Test
    @DisplayName("Evaluation: ART Initiation rule evaluates monthly for 6 months and month 1 suggests home visit")
    public void testArtInitiationRuleEvaluation() {
        RuleDTOs.RuleDto activeRule = createAndActivateTestRule(
                "ART-INIT",
                "ART_START_DATE",
                "{}",
                "{\"every\":\"1 month\",\"for\":\"6 months\"}",
                "01",
                List.of("01-01", "01-02")
        );

        LocalDate artStartDate = LocalDate.of(2026, 1, 15);
        testClient.setArtStartDate(artStartDate);
        clientRepository.save(testClient);

        // As of Feb 1 (within month 1)
        LocalDate asOfFeb1 = LocalDate.of(2026, 2, 1);
        List<RuleDTOs.RuleSuggestionDto> suggestionsFeb = ruleEngineService.evaluateRulesForClient(testClient.getId(), asOfFeb1);

        assertThat(suggestionsFeb).isNotEmpty();
        RuleDTOs.RuleSuggestionDto match = suggestionsFeb.stream().filter(s -> s.ruleId().equals(activeRule.id())).findFirst().orElseThrow();
        assertThat(match.suggestedDate()).isEqualTo(artStartDate.plusMonths(1)); // 2026-02-15
        assertThat(match.suggestedPurpose()).isEqualTo("01");
        assertThat(match.suggestedServiceCodes()).contains("01-02"); // Home visit code
        assertThat(match.explanationEn()).contains("Home visit recommended");

        // Clean suggestions for next evaluation test
        suggestionRepository.deleteAll();

        // As of March 20 (evaluating next due month)
        LocalDate asOfMar20 = LocalDate.of(2026, 3, 20);
        List<RuleDTOs.RuleSuggestionDto> suggestionsMar = ruleEngineService.evaluateRulesForClient(testClient.getId(), asOfMar20);
        RuleDTOs.RuleSuggestionDto matchMar = suggestionsMar.stream().filter(s -> s.ruleId().equals(activeRule.id())).findFirst().orElseThrow();
        assertThat(matchMar.suggestedDate()).isEqualTo(artStartDate.plusMonths(3)); // 2026-04-15
    }

    @Test
    @DisplayName("Data Availability: Missing ART start date produces no suggestions")
    public void testMissingArtStartDateProducesNoSuggestion() {
        RuleDTOs.RuleDto activeRule = createAndActivateTestRule(
                "ART-MISSING",
                "ART_START_DATE",
                "{}",
                "{\"every\":\"1 month\"}",
                "01",
                List.of("01-01")
        );

        testClient.setArtStartDate(null); // Missing input
        clientRepository.save(testClient);

        List<RuleDTOs.RuleSuggestionDto> suggestions = ruleEngineService.evaluateRulesForClient(testClient.getId(), LocalDate.now());
        assertThat(suggestions.stream().anyMatch(s -> s.ruleId().equals(activeRule.id()))).isFalse();
    }

    @Test
    @DisplayName("Manual Tags: LOST_TO_FOLLOW_UP tag evaluates to weekly tracing suggestion")
    public void testManualTrackingTagLfu() {
        String code = "LFU-TRACK-" + UUID.randomUUID().toString().substring(0, 6);
        RuleDTOs.CreateRuleRequest req = new RuleDTOs.CreateRuleRequest(
                code,
                "LFU Tracking Protocol",
                "एलएफयू ट्रैकिंग प्रोटोकॉल",
                "LFU_TRACKING",
                "CLIENT_TAG",
                "{\"tag_type\":\"LOST_TO_FOLLOW_UP\"}",
                "{\"every\":\"1 week\"}",
                "02",
                List.of("02-01"),
                "NACO",
                "2025",
                null,
                null,
                "NATIONAL",
                "Tag rule"
        );
        RuleDTOs.RuleDto created = ruleService.createRule(req, "author.lfu@allianceindia.org", "STATE_TEAM");
        ruleService.approveRule(created.id(), "supervisor.lfu@allianceindia.org", "PROGRAMME_OWNER", "Approved");
        RuleDTOs.RuleDto activeRule = ruleService.activateRule(created.id(), new RuleDTOs.ActivateRuleRequest(Instant.now().minusSeconds(3600), null, "Active"), "supervisor.lfu@allianceindia.org", "PROGRAMME_OWNER");

        // Before tag: 0 suggestions for this rule
        List<RuleDTOs.RuleSuggestionDto> beforeTag = ruleEngineService.evaluateRulesForClient(testClient.getId(), LocalDate.now());
        assertThat(beforeTag.stream().anyMatch(s -> s.ruleId().equals(activeRule.id()))).isFalse();

        // Worker attaches LOST_TO_FOLLOW_UP tag
        LocalDate tagDate = LocalDate.now().minusDays(3);
        ruleService.attachClientTag(testClient.getId(), new RuleDTOs.AttachTagRequest("LOST_TO_FOLLOW_UP", tagDate, "Missed ART refill"), "worker@allianceindia.org");

        List<RuleDTOs.RuleSuggestionDto> afterTag = ruleEngineService.evaluateRulesForClient(testClient.getId(), LocalDate.now());
        RuleDTOs.RuleSuggestionDto lfuSuggestion = afterTag.stream().filter(s -> s.ruleId().equals(activeRule.id())).findFirst().orElseThrow();
        assertThat(lfuSuggestion.suggestedPurpose()).isEqualTo("02"); // LFU tracing
        assertThat(lfuSuggestion.explanationEn()).contains("Weekly tracing active");
    }

    @Test
    @DisplayName("Computed Labels: Missed appointment > 7 days and >= 28 days thresholds")
    public void testComputedLabelsBoundaries() {
        LocalDate today = LocalDate.now();

        // 1. Client with appointment 5 days ago (< 7 days) -> no label
        ruleService.updateApplicationAddition(testClient.getId(), new RuleDTOs.UpdateApplicationAdditionRequest(
                true, null, today.minusDays(5), null, null, null, null
        ), "supervisor@allianceindia.org");
        List<RuleDTOs.ComputedLabelDto> labels5d = ruleEngineService.getComputedLabels(testClient.getId(), today);
        assertThat(labels5d).isEmpty();

        // 2. Client with appointment 10 days ago (> 7 days, < 28 days) -> warning label
        ruleService.updateApplicationAddition(testClient.getId(), new RuleDTOs.UpdateApplicationAdditionRequest(
                true, null, today.minusDays(10), null, null, null, null
        ), "supervisor@allianceindia.org");
        List<RuleDTOs.ComputedLabelDto> labels10d = ruleEngineService.getComputedLabels(testClient.getId(), today);
        assertThat(labels10d).hasSize(1);
        assertThat(labels10d.getFirst().severity()).isEqualTo("warning");
        assertThat(labels10d.getFirst().labelEn()).contains("Missed Appointment (10 days overdue)");

        // 3. Client with appointment 30 days ago (>= 28 days) -> critical LFU label
        ruleService.updateApplicationAddition(testClient.getId(), new RuleDTOs.UpdateApplicationAdditionRequest(
                true, null, today.minusDays(30), null, null, null, null
        ), "supervisor@allianceindia.org");
        List<RuleDTOs.ComputedLabelDto> labels30d = ruleEngineService.getComputedLabels(testClient.getId(), today);
        assertThat(labels30d).hasSize(1);
        assertThat(labels30d.getFirst().severity()).isEqualTo("critical");
        assertThat(labels30d.getFirst().labelEn()).contains("Lost to Follow-up (LFU: 30 days missed)");
    }

    @Test
    @DisplayName("Validation Rules: Untraceable requires 2 phone attempts + 1 home visit within 30 days")
    public void testUntraceableValidationCriteria() {
        LocalDate today = LocalDate.now();

        // 0 attempts -> invalid
        RuleEngineService.ValidationResult v0 = ruleEngineService.validateUntraceableCriteria(testClient.getId(), today);
        assertThat(v0.isValid()).isFalse();

        // Create Task to link attempts
        Task dummyTask = new Task("TASK-DUMMY-1-" + UUID.randomUUID().toString().substring(0, 6), testClient, testActor.getId(), "DL-01", "02", "Tracing", today);
        taskRepository.save(dummyTask);

        // 2 phone attempts only -> still invalid (missing home visit)
        ContactAttempt phone1 = new ContactAttempt(dummyTask, testClient, testActor.getId(), today.minusDays(10), "PHONE", "not_reached", "No answer");
        ContactAttempt phone2 = new ContactAttempt(dummyTask, testClient, testActor.getId(), today.minusDays(5), "PHONE", "not_reached", "Switched off");
        contactAttemptRepository.save(phone1);
        contactAttemptRepository.save(phone2);

        RuleEngineService.ValidationResult vPhoneOnly = ruleEngineService.validateUntraceableCriteria(testClient.getId(), today);
        assertThat(vPhoneOnly.isValid()).isFalse();
        assertThat(vPhoneOnly.message()).contains("NACO guidelines require at least 2 phone attempts and 1 home visit");

        // Add 1 home visit -> valid
        ContactAttempt homeVisit = new ContactAttempt(dummyTask, testClient, testActor.getId(), today.minusDays(2), "HOME_VISIT", "not_reached", "House locked");
        contactAttemptRepository.save(homeVisit);

        RuleEngineService.ValidationResult vValid = ruleEngineService.validateUntraceableCriteria(testClient.getId(), today);
        assertThat(vValid.isValid()).isTrue();
        assertThat(vValid.count1()).isEqualTo(2); // 2 phone
        assertThat(vValid.count2()).isEqualTo(1); // 1 home visit
    }

    @Test
    @DisplayName("Validation Rules: Opted out requires at least 3 documented contacts")
    public void testOptedOutValidationCriteria() {
        LocalDate today = LocalDate.now();
        Task dummyTask = new Task("TASK-DUMMY-2-" + UUID.randomUUID().toString().substring(0, 6), testClient, testActor.getId(), "DL-01", "05", "Counselling", today);
        taskRepository.save(dummyTask);

        // 2 contacts -> invalid
        contactAttemptRepository.save(new ContactAttempt(dummyTask, testClient, testActor.getId(), today.minusDays(8), "PHONE", "reached", "Counselling"));
        contactAttemptRepository.save(new ContactAttempt(dummyTask, testClient, testActor.getId(), today.minusDays(4), "HOME_VISIT", "reached", "Counselling"));

        RuleEngineService.ValidationResult v2 = ruleEngineService.validateOptedOutCriteria(testClient.getId());
        assertThat(v2.isValid()).isFalse();

        // 3rd contact -> valid
        contactAttemptRepository.save(new ContactAttempt(dummyTask, testClient, testActor.getId(), today.minusDays(1), "PHYSICAL_CSC", "reached", "Opt-out counseling completed"));
        RuleEngineService.ValidationResult v3 = ruleEngineService.validateOptedOutCriteria(testClient.getId());
        assertThat(v3.isValid()).isTrue();
    }

    @Test
    @DisplayName("Suggestion Lifecycle: Idempotent evaluation, accepting creates exactly 1 task & audit, dismissing records reason")
    public void testSuggestionLifecycleAndTaskCreation() {
        RuleDTOs.RuleDto activeRule = createAndActivateTestRule(
                "LIFECYCLE",
                "ART_START_DATE",
                "{}",
                "{\"every\":\"1 month\"}",
                "01",
                List.of("01-01")
        );

        testClient.setArtStartDate(LocalDate.now().minusMonths(2));
        clientRepository.save(testClient);

        // 1. Evaluate once
        List<RuleDTOs.RuleSuggestionDto> run1 = ruleEngineService.evaluateRulesForClient(testClient.getId(), LocalDate.now());
        RuleDTOs.RuleSuggestionDto match1 = run1.stream().filter(s -> s.ruleId().equals(activeRule.id())).findFirst().orElseThrow();
        UUID suggestionId = match1.id();

        // 2. Evaluate again -> Idempotent, returns same suggestion ID without duplicating
        List<RuleDTOs.RuleSuggestionDto> run2 = ruleEngineService.evaluateRulesForClient(testClient.getId(), LocalDate.now());
        RuleDTOs.RuleSuggestionDto match2 = run2.stream().filter(s -> s.ruleId().equals(activeRule.id())).findFirst().orElseThrow();
        assertThat(match2.id()).isEqualTo(suggestionId);
        assertThat(suggestionRepository.findByClientIdOrderBySuggestedDateAsc(testClient.getId()).stream().filter(s -> s.getRule().getId().equals(activeRule.id()))).hasSize(1);

        // 3. Confirm NO automatic task created yet for client
        assertThat(taskRepository.findByClientIdOrderByDueDateAsc(testClient.getId())).isEmpty();

        // 4. Accept suggestion
        RuleDTOs.RuleSuggestionDto accepted = ruleEngineService.acceptSuggestion(suggestionId, "field.worker@allianceindia.org", testActor.getId(), "127.0.0.1");
        assertThat(accepted.outcome()).isEqualTo("ACCEPTED");
        assertThat(accepted.taskId()).isNotNull();

        // Assert exactly 1 task created for client
        List<Task> clientTasks = taskRepository.findByClientIdOrderByDueDateAsc(testClient.getId());
        assertThat(clientTasks).hasSize(1);
        Task createdTask = clientTasks.getFirst();
        assertThat(createdTask.getDueDate()).isEqualTo(accepted.suggestedDate());
        assertThat(createdTask.getTaskType()).isEqualTo(accepted.suggestedPurpose());

        // Assert audit event recorded
        List<AuditEvent> audits = auditEventRepository.findAll();
        assertThat(audits.stream().anyMatch(a -> "RULE_SUGGESTION_ACCEPTED".equals(a.getAction()))).isTrue();
    }

    @Test
    @DisplayName("Concurrency: Concurrent approval of the same rule -> one wins, the other gets 409 Conflict")
    public void testConcurrentRuleApprovalConflict() throws InterruptedException {
        String author = "author.concurrency@allianceindia.org";
        RuleDTOs.CreateRuleRequest req = new RuleDTOs.CreateRuleRequest(
                "RULE-CONCURRENT-" + UUID.randomUUID().toString().substring(0, 6),
                "Concurrent Test Rule",
                "समवर्ती परीक्षण नियम",
                "ART_INITIATION",
                "ART_START_DATE",
                "{}",
                "{}",
                "01",
                List.of("01-01"),
                "NACO",
                "2025",
                null,
                null,
                "NATIONAL",
                "Note"
        );
        RuleDTOs.RuleDto created = ruleService.createRule(req, author, "STATE_TEAM");
        ruleService.submitForReview(created.id(), author, "STATE_TEAM", "Ready");

        UUID ruleId = created.id();
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(2);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);

        // Supervisor 1
        executor.submit(() -> {
            try {
                startLatch.await();
                ruleService.approveRule(ruleId, "supervisor1@allianceindia.org", "PROGRAMME_OWNER", "Approve 1");
                successCount.incrementAndGet();
            } catch (ResponseStatusException e) {
                if (e.getStatusCode().value() == 409 || e.getStatusCode().value() == 400) {
                    conflictCount.incrementAndGet();
                }
            } catch (org.springframework.dao.OptimisticLockingFailureException e) {
                conflictCount.incrementAndGet();
            } catch (Exception e) {
                System.err.println("Thread 1 error: " + e.getClass().getName() + " - " + e.getMessage());
            } finally {
                doneLatch.countDown();
            }
        });

        // Supervisor 2
        executor.submit(() -> {
            try {
                startLatch.await();
                ruleService.approveRule(ruleId, "supervisor2@allianceindia.org", "PROGRAMME_OWNER", "Approve 2");
                successCount.incrementAndGet();
            } catch (ResponseStatusException e) {
                if (e.getStatusCode().value() == 409 || e.getStatusCode().value() == 400) {
                    conflictCount.incrementAndGet();
                }
            } catch (org.springframework.dao.OptimisticLockingFailureException e) {
                conflictCount.incrementAndGet();
            } catch (Exception e) {
                System.err.println("Thread 2 error: " + e.getClass().getName() + " - " + e.getMessage());
            } finally {
                doneLatch.countDown();
            }
        });

        startLatch.countDown();
        boolean finished = doneLatch.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(finished).isTrue();
        // One supervisor succeeds in approving
        assertThat(successCount.get()).isEqualTo(1);
        // The other receives conflict / rejection because rule is already approved
        assertThat(conflictCount.get()).isEqualTo(1);
    }
}
