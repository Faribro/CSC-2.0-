package org.allianceindia.csc2.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.allianceindia.csc2.domain.*;
import org.allianceindia.csc2.dto.RuleDTOs;
import org.allianceindia.csc2.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class RuleEngineService {

    public static final ZoneId IST_ZONE = ZoneId.of("Asia/Kolkata");

    private final FollowUpRuleRepository ruleRepository;
    private final RuleSuggestionRepository suggestionRepository;
    private final ClientRepository clientRepository;
    private final ClientTrackingTagRepository tagRepository;
    private final ClientApplicationAdditionRepository additionRepository;
    private final ContactAttemptRepository contactAttemptRepository;
    private final TaskRepository taskRepository;
    private final AuditEventRepository auditEventRepository;
    private final ObjectMapper objectMapper;

    public RuleEngineService(FollowUpRuleRepository ruleRepository,
                             RuleSuggestionRepository suggestionRepository,
                             ClientRepository clientRepository,
                             ClientTrackingTagRepository tagRepository,
                             ClientApplicationAdditionRepository additionRepository,
                             ContactAttemptRepository contactAttemptRepository,
                             TaskRepository taskRepository,
                             AuditEventRepository auditEventRepository,
                             ObjectMapper objectMapper) {
        this.ruleRepository = ruleRepository;
        this.suggestionRepository = suggestionRepository;
        this.clientRepository = clientRepository;
        this.tagRepository = tagRepository;
        this.additionRepository = additionRepository;
        this.contactAttemptRepository = contactAttemptRepository;
        this.taskRepository = taskRepository;
        this.auditEventRepository = auditEventRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Deterministic evaluation of ACTIVE + APPROVED rules for a client on demand.
     * Evaluates in Asia/Kolkata timezone.
     * Output suggestions only. No automatic task creation unless auto_create_tasks is explicitly enabled.
     */
    @Transactional
    public List<RuleDTOs.RuleSuggestionDto> evaluateRulesForClient(UUID clientId, LocalDate asOfDate) {
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Client not found"));

        LocalDate today = asOfDate != null ? asOfDate : LocalDate.now(IST_ZONE);
        Instant now = Instant.now();

        // Query active rules in force
        List<FollowUpRule> activeRules = ruleRepository.findActiveRulesInForce(now);
        List<RuleDTOs.RuleSuggestionDto> generated = new ArrayList<>();

        for (FollowUpRule rule : activeRules) {
            RuleSuggestion candidate = evaluateSingleRule(rule, client, today);
            if (candidate != null) {
                // Idempotent upsert check
                Optional<RuleSuggestion> existing = suggestionRepository
                        .findByClientIdAndRuleIdAndRuleVersionAndSuggestedDate(
                                client.getId(), rule.getId(), rule.getVersion(), candidate.getSuggestedDate()
                        );
                if (existing.isPresent()) {
                    generated.add(toSuggestionDto(existing.get()));
                } else {
                    RuleSuggestion saved = suggestionRepository.save(candidate);

                    // Auto-create task if rule explicitly has auto_create_tasks enabled (default off)
                    if (rule.isAutoCreateTasks()) {
                        Task autoTask = createTaskFromSuggestion(saved, "SYSTEM_AUTO_RULE", client.getAssignedWorkerId());
                        saved.setTaskId(autoTask.getId());
                        saved.setOutcome("ACCEPTED");
                        saved.setDecidedBy("SYSTEM_AUTO");
                        saved.setDecidedAt(Instant.now());
                        saved = suggestionRepository.save(saved);
                    }

                    generated.add(toSuggestionDto(saved));
                }
            }
        }

        return generated;
    }

    private RuleSuggestion evaluateSingleRule(FollowUpRule rule, Client client, LocalDate today) {
        String triggerType = rule.getTriggerType();

        switch (triggerType) {
            case "ART_START_DATE": {
                // Rule a: Newly started on ART -> monthly contact for 6 months, one home visit in the first month
                if (client.getArtStartDate() == null) {
                    return null; // Missing input -> stay inactive for this client
                }
                LocalDate artStart = client.getArtStartDate();

                // Compute the 6 monthly interval dates
                for (int m = 1; m <= 6; m++) {
                    LocalDate targetDate = artStart.plusMonths(m);
                    if (!targetDate.isBefore(today)) {
                        RuleSuggestion s = new RuleSuggestion();
                        s.setClient(client);
                        s.setRule(rule);
                        s.setRuleVersion(rule.getVersion());
                        s.setSuggestedDate(targetDate);
                        s.setSuggestedPurpose(rule.getPurposeCode() != null ? rule.getPurposeCode() : "01");
                        s.setSuggestedServiceCodes(m == 1 ? "[\"01-01\", \"01-02\"]" : "[\"01-01\"]");
                        s.setExplanationEn(String.format("NACO 2025 ART Initiation Protocol: Routine monthly follow-up #%d (%s) following ART start on %s.",
                                m, (m == 1 ? "Home visit recommended" : "Field contact"), artStart));
                        s.setExplanationHi(String.format("नाको 2025 एआरटी दीक्षा प्रोटोकॉल: एआरटी प्रारंभ (%s) के बाद नियमित मासिक फॉलो-अप #%d (%s)।",
                                artStart, m, (m == 1 ? "गृह भेंट अनुशंसित" : "क्षेत्रीय संपर्क")));
                        s.setDatesUsed(String.format("{\"art_start_date\":\"%s\",\"month_index\":%d,\"target_date\":\"%s\"}", artStart, m, targetDate));
                        return s;
                    }
                }
                return null;
            }

            case "CLIENT_TAG": {
                // Rule b & c: Lost to follow-up weekly; Brought back to care monthly for 3 months
                if (rule.getCode().contains("LFU-TRACK")) {
                    Optional<ClientTrackingTag> tagOpt = tagRepository.findFirstByClientIdAndTagTypeOrderByEventDateDesc(client.getId(), "LOST_TO_FOLLOW_UP");
                    if (tagOpt.isEmpty()) return null;

                    ClientTrackingTag tag = tagOpt.get();
                    LocalDate targetDate = tag.getEventDate().plusWeeks(1);
                    if (targetDate.isBefore(today)) {
                        targetDate = today;
                    }

                    RuleSuggestion s = new RuleSuggestion();
                    s.setClient(client);
                    s.setRule(rule);
                    s.setRuleVersion(rule.getVersion());
                    s.setSuggestedDate(targetDate);
                    s.setSuggestedPurpose(rule.getPurposeCode() != null ? rule.getPurposeCode() : "02");
                    s.setSuggestedServiceCodes("[\"02-01\"]");
                    s.setExplanationEn(String.format("NACO 2025 LFU Protocol: Weekly tracing active since %s until definite tracking outcome.", tag.getEventDate()));
                    s.setExplanationHi(String.format("नाको 2025 एलएफयू प्रोटोकॉल: %s से निश्चित ट्रैकिंग परिणाम तक साप्ताहिक ट्रैकिंग सक्रिय।", tag.getEventDate()));
                    s.setDatesUsed(String.format("{\"lfu_tagged_date\":\"%s\",\"cadence\":\"weekly\"}", tag.getEventDate()));
                    return s;
                } else if (rule.getCode().contains("RE-ENGAGED")) {
                    Optional<ClientTrackingTag> tagOpt = tagRepository.findFirstByClientIdAndTagTypeOrderByEventDateDesc(client.getId(), "BROUGHT_BACK");
                    if (tagOpt.isEmpty()) return null;

                    ClientTrackingTag tag = tagOpt.get();
                    for (int m = 1; m <= 3; m++) {
                        LocalDate targetDate = tag.getEventDate().plusMonths(m);
                        if (!targetDate.isBefore(today)) {
                            RuleSuggestion s = new RuleSuggestion();
                            s.setClient(client);
                            s.setRule(rule);
                            s.setRuleVersion(rule.getVersion());
                            s.setSuggestedDate(targetDate);
                            s.setSuggestedPurpose(rule.getPurposeCode() != null ? rule.getPurposeCode() : "01");
                            s.setSuggestedServiceCodes("[\"01-03\"]");
                            s.setExplanationEn(String.format("NACO 2025 Re-engagement Protocol: Monthly stabilization contact #%d post-return to care on %s.", m, tag.getEventDate()));
                            s.setExplanationHi(String.format("नाको 2025 पुनः देखरेख प्रोटोकॉल: %s को वापसी के बाद मासिक स्थिरीकरण संपर्क #%d।", tag.getEventDate(), m));
                            s.setDatesUsed(String.format("{\"brought_back_date\":\"%s\",\"month_index\":%d,\"target_date\":\"%s\"}", tag.getEventDate(), m, targetDate));
                            return s;
                        }
                    }
                    return null;
                }
                return null;
            }

            case "VIRAL_LOAD_SCHEDULE": {
                // Rule g: Viral load routine schedule (6m, 12m, yearly)
                if (client.getArtStartDate() == null) return null;

                LocalDate artStart = client.getArtStartDate();
                LocalDate vl6 = artStart.plusMonths(6);
                LocalDate vl12 = artStart.plusMonths(12);

                LocalDate targetDate = !vl6.isBefore(today) ? vl6 : !vl12.isBefore(today) ? vl12 : artStart.plusYears(Math.max(2, ChronoUnit.YEARS.between(artStart, today) + 1));

                RuleSuggestion s = new RuleSuggestion();
                s.setClient(client);
                s.setRule(rule);
                s.setRuleVersion(rule.getVersion());
                s.setSuggestedDate(targetDate);
                s.setSuggestedPurpose(rule.getPurposeCode() != null ? rule.getPurposeCode() : "03");
                s.setSuggestedServiceCodes("[\"03-01\"]");
                s.setExplanationEn(String.format("NACO National Treatment Guidelines: Routine Viral Load monitoring milestone (target date: %s).", targetDate));
                s.setExplanationHi(String.format("नाको राष्ट्रीय उपचार दिशानिर्देश: नियमित वायरल लोड निगरानी मील का पत्थर (लक्ष्य तिथि: %s)।", targetDate));
                s.setDatesUsed(String.format("{\"art_start_date\":\"%s\",\"next_vl_target\":\"%s\"}", artStart, targetDate));
                return s;
            }

            case "PREGNANCY_INFANT_STATUS": {
                // Rule h: Requires application additions
                Optional<ClientApplicationAddition> additionOpt = additionRepository.findByClientId(client.getId());
                if (additionOpt.isEmpty() || !additionOpt.get().isEnabled()) return null;

                ClientApplicationAddition add = additionOpt.get();
                if (add.getExpectedDeliveryDate() == null && add.getInfantDob() == null) return null;

                LocalDate targetDate = add.getExpectedDeliveryDate() != null
                        ? add.getExpectedDeliveryDate().minusWeeks(4) // 32-36 weeks viral load
                        : add.getInfantDob().plusMonths(6);

                RuleSuggestion s = new RuleSuggestion();
                s.setClient(client);
                s.setRule(rule);
                s.setRuleVersion(rule.getVersion());
                s.setSuggestedDate(targetDate);
                s.setSuggestedPurpose(rule.getPurposeCode() != null ? rule.getPurposeCode() : "04");
                s.setSuggestedServiceCodes("[\"04-01\"]");
                s.setExplanationEn(String.format("NACO/EVTHS 2024: Maternal & Infant PMTCT cohort follow-up milestone (target: %s).", targetDate));
                s.setExplanationHi(String.format("नाको/EVTHS 2024: मातृ एवं शिशु पीएमटीसीटी समूह फॉलो-अप मील का पत्थर (लक्ष्य: %s)।", targetDate));
                s.setDatesUsed(String.format("{\"edd\":\"%s\",\"infant_dob\":\"%s\"}", add.getExpectedDeliveryDate(), add.getInfantDob()));
                return s;
            }

            case "TB_TREATMENT": {
                // Rule i: Requires TB treatment dates from additions
                Optional<ClientApplicationAddition> additionOpt = additionRepository.findByClientId(client.getId());
                if (additionOpt.isEmpty() || !additionOpt.get().isEnabled()) return null;
                // Stays inactive if missing
                return null;
            }

            default:
                return null;
        }
    }

    /**
     * Untraceable validation rule:
     * Requires at least 2 distinct phone attempts and 1 distinct home visit within 30 days.
     */
    public ValidationResult validateUntraceableCriteria(UUID clientId, LocalDate asOfDate) {
        LocalDate today = asOfDate != null ? asOfDate : LocalDate.now(IST_ZONE);
        LocalDate windowStart = today.minusDays(30);

        List<ContactAttempt> attempts = contactAttemptRepository.findByClientIdOrderByAttemptDateDesc(clientId);

        long phoneAttempts = attempts.stream()
                .filter(a -> !a.getAttemptDate().isBefore(windowStart))
                .filter(a -> "PHONE".equalsIgnoreCase(a.getChannel()))
                .count();

        long homeVisits = attempts.stream()
                .filter(a -> !a.getAttemptDate().isBefore(windowStart))
                .filter(a -> "HOME_VISIT".equalsIgnoreCase(a.getChannel()))
                .count();

        boolean valid = phoneAttempts >= 2 && homeVisits >= 1;
        String message = valid
                ? "Untraceable criteria met: " + phoneAttempts + " phone attempt(s) and " + homeVisits + " home visit(s) documented within 30 days."
                : String.format("Untraceable criteria NOT met: NACO guidelines require at least 2 phone attempts and 1 home visit within 30 days (documented: %d phone, %d home visit).", phoneAttempts, homeVisits);

        return new ValidationResult(valid, message, phoneAttempts, homeVisits);
    }

    /**
     * Opted out validation rule:
     * Requires counselling and at least 3 documented contacts.
     */
    public ValidationResult validateOptedOutCriteria(UUID clientId) {
        List<ContactAttempt> attempts = contactAttemptRepository.findByClientIdOrderByAttemptDateDesc(clientId);
        long totalContacts = attempts.size();

        boolean valid = totalContacts >= 3;
        String message = valid
                ? "Opted-out criteria met: " + totalContacts + " documented contacts on file with counselling notes."
                : "Opted-out criteria NOT met: NACO guidelines require documented counselling and at least 3 documented contacts (currently recorded: " + totalContacts + ").";

        return new ValidationResult(valid, message, totalContacts, 0);
    }

    public record ValidationResult(boolean isValid, String message, long count1, long count2) {}

    /**
     * Computed labels for client (e.g. WHO 7-day missed visit, 28-day LFU).
     * Shown as text with icon, never colour only, editable/dismissable with a reason.
     */
    public List<RuleDTOs.ComputedLabelDto> getComputedLabels(UUID clientId, LocalDate asOfDate) {
        LocalDate today = asOfDate != null ? asOfDate : LocalDate.now(IST_ZONE);
        List<RuleDTOs.ComputedLabelDto> labels = new ArrayList<>();

        Optional<ClientApplicationAddition> addOpt = additionRepository.findByClientId(clientId);
        if (addOpt.isPresent() && addOpt.get().isEnabled() && addOpt.get().getArtCentreNextDueDate() != null) {
            LocalDate dueDate = addOpt.get().getArtCentreNextDueDate();
            if (dueDate.isBefore(today)) {
                long daysMissed = ChronoUnit.DAYS.between(dueDate, today);
                if (daysMissed >= 28) {
                    labels.add(new RuleDTOs.ComputedLabelDto(
                            "lfu-28d",
                            "Lost to Follow-up (LFU: " + daysMissed + " days missed)",
                            "फॉलो-अप से छूटे (LFU: " + daysMissed + " दिन छूटे)",
                            "RULE-WHO-2024-COMPUTED-LABELS",
                            "critical",
                            "AlertTriangle",
                            (int) daysMissed,
                            true
                    ));
                } else if (daysMissed > 7) {
                    labels.add(new RuleDTOs.ComputedLabelDto(
                            "missed-7d",
                            "Missed Appointment (" + daysMissed + " days overdue)",
                            "नियुक्ति छूटी (" + daysMissed + " दिन विलंबित)",
                            "RULE-WHO-2024-COMPUTED-LABELS",
                            "warning",
                            "Clock",
                            (int) daysMissed,
                            true
                    ));
                }
            }
        }

        // Also check if manual tags exist
        Optional<ClientTrackingTag> lfuTag = tagRepository.findFirstByClientIdAndTagTypeOrderByEventDateDesc(clientId, "LOST_TO_FOLLOW_UP");
        if (lfuTag.isPresent() && labels.stream().noneMatch(l -> l.id().equals("lfu-28d"))) {
            labels.add(new RuleDTOs.ComputedLabelDto(
                    "lfu-manual-tag",
                    "Lost to Follow-Up (Tagged on " + lfuTag.get().getEventDate() + ")",
                    "फॉलो-अप से छूटे (" + lfuTag.get().getEventDate() + " को टैग किया गया)",
                    "RULE-NACO-2025-LFU-TRACK",
                    "warning",
                    "UserX",
                    (int) ChronoUnit.DAYS.between(lfuTag.get().getEventDate(), today),
                    true
            ));
        }

        return labels;
    }

    /**
     * Get pending suggestions for client.
     */
    public List<RuleDTOs.RuleSuggestionDto> getClientSuggestions(UUID clientId) {
        return suggestionRepository.findPendingByClientId(clientId).stream()
                .map(this::toSuggestionDto)
                .toList();
    }

    /**
     * Accept suggestion:
     * Creates exactly one Task and one Audit record.
     */
    @Transactional
    public RuleDTOs.RuleSuggestionDto acceptSuggestion(UUID suggestionId, String userEmail, UUID actorId, String ipAddress) {
        RuleSuggestion suggestion = suggestionRepository.findById(suggestionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Suggestion not found"));

        if (!"PENDING".equals(suggestion.getOutcome())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Suggestion already decided with outcome: " + suggestion.getOutcome());
        }

        Task task = createTaskFromSuggestion(suggestion, userEmail, actorId);

        suggestion.setTaskId(task.getId());
        suggestion.setOutcome("ACCEPTED");
        suggestion.setDecidedBy(userEmail);
        suggestion.setDecidedAt(Instant.now());

        RuleSuggestion saved = suggestionRepository.save(suggestion);

        AuditEvent audit = new AuditEvent(
                actorId, userEmail, task.getCenterId(),
                "RULE_SUGGESTION_ACCEPTED", "RULE_SUGGESTION", suggestion.getId(),
                ipAddress, String.format("{\"taskId\":\"%s\",\"ruleCode\":\"%s\",\"suggestedDate\":\"%s\"}",
                task.getId(), suggestion.getRule().getCode(), suggestion.getSuggestedDate())
        );
        auditEventRepository.save(audit);

        return toSuggestionDto(saved);
    }

    /**
     * Edit suggestion:
     * Creates Task with custom date/purpose and records audit entry.
     */
    @Transactional
    public RuleDTOs.RuleSuggestionDto editSuggestion(UUID suggestionId, RuleDTOs.SuggestionDecisionRequest req, String userEmail, UUID actorId, String ipAddress) {
        RuleSuggestion suggestion = suggestionRepository.findById(suggestionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Suggestion not found"));

        if (!"PENDING".equals(suggestion.getOutcome())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Suggestion already decided: " + suggestion.getOutcome());
        }

        LocalDate effectiveDate = req.customDate() != null ? req.customDate() : suggestion.getSuggestedDate();
        String effectivePurpose = req.customPurpose() != null ? req.customPurpose() : suggestion.getSuggestedPurpose();

        Client client = suggestion.getClient();
        String taskRef = "TASK-S-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Task task = new Task(
                taskRef,
                client,
                client.getAssignedWorkerId() != null ? client.getAssignedWorkerId() : client.getFieldUserId(),
                client.getCenterId(),
                effectivePurpose,
                suggestion.getExplanationEn(),
                effectiveDate
        );
        taskRepository.save(task);

        suggestion.setTaskId(task.getId());
        suggestion.setOutcome("EDITED");
        suggestion.setDecidedBy(userEmail);
        suggestion.setDecidedAt(Instant.now());
        if (req.customDate() != null) suggestion.setSuggestedDate(req.customDate());
        if (req.customPurpose() != null) suggestion.setSuggestedPurpose(req.customPurpose());

        RuleSuggestion saved = suggestionRepository.save(suggestion);

        AuditEvent audit = new AuditEvent(
                actorId, userEmail, task.getCenterId(),
                "RULE_SUGGESTION_EDITED", "RULE_SUGGESTION", suggestion.getId(),
                ipAddress, String.format("{\"taskId\":\"%s\",\"customDate\":\"%s\",\"customPurpose\":\"%s\"}",
                task.getId(), effectiveDate, effectivePurpose)
        );
        auditEventRepository.save(audit);

        return toSuggestionDto(saved);
    }

    /**
     * Dismiss suggestion:
     * Records dismissal reason, keeps suggestion history, does NOT create task.
     */
    @Transactional
    public RuleDTOs.RuleSuggestionDto dismissSuggestion(UUID suggestionId, String reason, String userEmail, UUID actorId, String ipAddress) {
        RuleSuggestion suggestion = suggestionRepository.findById(suggestionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Suggestion not found"));

        if (!"PENDING".equals(suggestion.getOutcome())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Suggestion already decided: " + suggestion.getOutcome());
        }

        suggestion.setOutcome("DISMISSED");
        suggestion.setDismissedReason(reason != null ? reason : "Dismissed by field worker");
        suggestion.setDecidedBy(userEmail);
        suggestion.setDecidedAt(Instant.now());

        RuleSuggestion saved = suggestionRepository.save(suggestion);

        AuditEvent audit = new AuditEvent(
                actorId, userEmail, suggestion.getClient().getCenterId(),
                "RULE_SUGGESTION_DISMISSED", "RULE_SUGGESTION", suggestion.getId(),
                ipAddress, String.format("{\"ruleCode\":\"%s\",\"dismissedReason\":\"%s\"}",
                suggestion.getRule().getCode(), reason != null ? reason.replace("\"", "\\\"") : "")
        );
        auditEventRepository.save(audit);

        return toSuggestionDto(saved);
    }

    private Task createTaskFromSuggestion(RuleSuggestion suggestion, String userEmail, UUID actorId) {
        Client client = suggestion.getClient();
        String taskRef = "TASK-R-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Task task = new Task(
                taskRef,
                client,
                client.getAssignedWorkerId() != null ? client.getAssignedWorkerId() : client.getFieldUserId(),
                client.getCenterId(),
                suggestion.getSuggestedPurpose(),
                suggestion.getExplanationEn(),
                suggestion.getSuggestedDate()
        );
        return taskRepository.save(task);
    }

    /**
     * Supervisor view:
     * Clients where an active rule says follow-up is due, but no open task exists.
     */
    public List<RuleDTOs.DueWithoutTaskSummary> getDueWithoutTask(String centerId, LocalDate asOfDate) {
        LocalDate today = asOfDate != null ? asOfDate : LocalDate.now(IST_ZONE);
        List<RuleSuggestion> dueSuggestions = suggestionRepository.findDueSuggestions(today);

        List<RuleDTOs.DueWithoutTaskSummary> results = new ArrayList<>();
        for (RuleSuggestion s : dueSuggestions) {
            Client client = s.getClient();
            if (centerId != null && !centerId.equalsIgnoreCase(client.getCenterId())) {
                continue;
            }

            long openTasks = taskRepository.countByClientIdAndStatusIn(client.getId(), List.of("PENDING", "DUE", "OVERDUE"));
            if (openTasks == 0) {
                long daysOverdue = ChronoUnit.DAYS.between(s.getSuggestedDate(), today);
                results.add(new RuleDTOs.DueWithoutTaskSummary(
                        client.getId(),
                        client.getClientRef(),
                        client.getFullName(),
                        client.getCenterId(),
                        s.getRule().getId(),
                        s.getRule().getCode(),
                        s.getRule().getTitleEn(),
                        s.getRule().getTitleHi(),
                        s.getSuggestedDate(),
                        Math.max(0, daysOverdue),
                        s.getExplanationEn(),
                        s.getExplanationHi()
                ));
            }
        }
        return results;
    }

    public RuleDTOs.RulePreviewResult previewRule(UUID ruleId, String centerId) {
        FollowUpRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rule not found"));

        List<Client> clients = clientRepository.findAll();
        int evaluated = 0;
        List<RuleDTOs.RuleSuggestionDto> samples = new ArrayList<>();

        LocalDate today = LocalDate.now(IST_ZONE);
        for (Client c : clients) {
            evaluated++;
            RuleSuggestion s = evaluateSingleRule(rule, c, today);
            if (s != null && samples.size() < 10) {
                samples.add(new RuleDTOs.RuleSuggestionDto(
                        null,
                        null,
                        c.getId(),
                        c.getClientRef(),
                        c.getFullName(),
                        rule.getId(),
                        rule.getCode(),
                        rule.getTitleEn(),
                        rule.getTitleHi(),
                        rule.getVersion(),
                        rule.getSourceName(),
                        rule.getSourceEdition(),
                        s.getSuggestedDate(),
                        s.getSuggestedPurpose(),
                        "Care & Support",
                        "देखभाल एवं सहायता",
                        List.of("01-01"),
                        s.getExplanationEn(),
                        s.getExplanationHi(),
                        s.getDatesUsed(),
                        "PREVIEW",
                        null,
                        null,
                        null,
                        Instant.now()
                ));
            }
        }

        return new RuleDTOs.RulePreviewResult(
                rule.getId(),
                rule.getCode(),
                evaluated,
                samples.size(),
                samples
        );
    }

    private RuleDTOs.RuleSuggestionDto toSuggestionDto(RuleSuggestion s) {
        List<String> services = List.of();
        try {
            services = objectMapper.readValue(s.getSuggestedServiceCodes(), new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
        } catch (Exception ignored) {}

        return new RuleDTOs.RuleSuggestionDto(
                s.getId(),
                s.getTaskId(),
                s.getClient().getId(),
                s.getClient().getClientRef(),
                s.getClient().getFullName(),
                s.getRule().getId(),
                s.getRule().getCode(),
                s.getRule().getTitleEn(),
                s.getRule().getTitleHi(),
                s.getRuleVersion(),
                s.getRule().getSourceName(),
                s.getRule().getSourceEdition(),
                s.getSuggestedDate(),
                s.getSuggestedPurpose(),
                getPurposeLabelEn(s.getSuggestedPurpose()),
                getPurposeLabelHi(s.getSuggestedPurpose()),
                services,
                s.getExplanationEn(),
                s.getExplanationHi(),
                s.getDatesUsed(),
                s.getOutcome(),
                s.getDismissedReason(),
                s.getDecidedBy(),
                s.getDecidedAt(),
                s.getCreatedAt()
        );
    }

    private String getPurposeLabelEn(String code) {
        return switch (code) {
            case "01" -> "Care & Support / Retention";
            case "02" -> "LFU Tracing";
            case "03" -> "Routine Viral Load";
            case "04" -> "PMTCT / Infant Tracking";
            case "05" -> "Beneficiary Counselling";
            case "06" -> "TB Treatment Monitoring";
            default -> "Follow-Up Visit";
        };
    }

    private String getPurposeLabelHi(String code) {
        return switch (code) {
            case "01" -> "देखभाल एवं सहायता / प्रतिधारण";
            case "02" -> "एलएफयू ट्रेसिंग";
            case "03" -> "नियमित वायरल लोड";
            case "04" -> "पीएमटीसीटी / शिशु ट्रैकिंग";
            case "05" -> "लाभार्थी परामर्श";
            case "06" -> "टीबी उपचार निगरानी";
            default -> "फॉलो-अप भेंट";
        };
    }
}
