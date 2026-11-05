package org.allianceindia.csc2.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.allianceindia.csc2.domain.Client;
import org.allianceindia.csc2.domain.ClientApplicationAddition;
import org.allianceindia.csc2.domain.ClientTrackingTag;
import org.allianceindia.csc2.domain.FollowUpRule;
import org.allianceindia.csc2.domain.FollowUpRuleHistory;
import org.allianceindia.csc2.domain.ArtCentrePriorityImport;
import org.allianceindia.csc2.dto.RuleDTOs;
import org.allianceindia.csc2.repository.ClientApplicationAdditionRepository;
import org.allianceindia.csc2.repository.ClientRepository;
import org.allianceindia.csc2.repository.ClientTrackingTagRepository;
import org.allianceindia.csc2.repository.FollowUpRuleHistoryRepository;
import org.allianceindia.csc2.repository.FollowUpRuleRepository;
import org.allianceindia.csc2.repository.ArtCentrePriorityImportRepository;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.*;

@Service
public class FollowUpRuleService {

    private final FollowUpRuleRepository ruleRepository;
    private final FollowUpRuleHistoryRepository historyRepository;
    private final ClientRepository clientRepository;
    private final ClientTrackingTagRepository tagRepository;
    private final ClientApplicationAdditionRepository additionRepository;
    private final ArtCentrePriorityImportRepository importRepository;
    private final ObjectMapper objectMapper;

    public FollowUpRuleService(FollowUpRuleRepository ruleRepository,
                               FollowUpRuleHistoryRepository historyRepository,
                               ClientRepository clientRepository,
                               ClientTrackingTagRepository tagRepository,
                               ClientApplicationAdditionRepository additionRepository,
                               ArtCentrePriorityImportRepository importRepository,
                               ObjectMapper objectMapper) {
        this.ruleRepository = ruleRepository;
        this.historyRepository = historyRepository;
        this.clientRepository = clientRepository;
        this.tagRepository = tagRepository;
        this.additionRepository = additionRepository;
        this.importRepository = importRepository;
        this.objectMapper = objectMapper;
    }

    private String calculateSha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            HexFormat hex = HexFormat.of();
            return hex.formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    private void recordHistory(FollowUpRule rule, String changedBy, String changeNote) {
        try {
            String snapshot = objectMapper.writeValueAsString(rule);
            FollowUpRuleHistory history = new FollowUpRuleHistory(
                    rule,
                    rule.getVersion(),
                    rule.getStatus(),
                    snapshot,
                    changedBy,
                    changeNote
            );
            historyRepository.save(history);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize rule snapshot for history", e);
        }
    }

    public List<RuleDTOs.RuleDto> listRules(String status, String category, String scope) {
        List<FollowUpRule> rules = ruleRepository.findWithFilters(status, category, scope);
        return rules.stream().map(this::toDto).toList();
    }

    public List<RuleDTOs.RuleDto> getActiveRulesInForce(Instant asOf) {
        Instant queryTime = asOf != null ? asOf : Instant.now();
        List<FollowUpRule> rules = ruleRepository.findActiveRulesInForce(queryTime);
        return rules.stream().map(this::toDto).toList();
    }

    public RuleDTOs.RuleDto getRuleById(UUID id) {
        FollowUpRule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Follow-up rule not found"));
        return toDto(rule);
    }

    public List<RuleDTOs.RuleHistoryDto> getRuleHistory(UUID id) {
        FollowUpRule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Follow-up rule not found"));
        List<FollowUpRuleHistory> histories = historyRepository.findByRuleIdOrderByCreatedAtDesc(rule.getId());
        return histories.stream().map(h -> new RuleDTOs.RuleHistoryDto(
                h.getId(),
                rule.getId(),
                h.getVersion(),
                h.getStatus(),
                h.getRuleSnapshot(),
                h.getChangedBy(),
                h.getChangeNote(),
                h.getCreatedAt()
        )).toList();
    }

    @Transactional
    public RuleDTOs.RuleDto createRule(RuleDTOs.CreateRuleRequest req, String userEmail, String userRole) {
        if ("LEADERSHIP".equalsIgnoreCase(userRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Leadership role is read-only and cannot create rules");
        }
        if (req.code() == null || req.code().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rule code is required");
        }
        if (ruleRepository.findByCode(req.code().trim()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Rule code already exists: " + req.code());
        }

        FollowUpRule rule = new FollowUpRule();
        rule.setCode(req.code().trim());
        rule.setTitleEn(req.titleEn() != null ? req.titleEn() : "[PROPOSED] " + req.code());
        rule.setTitleHi(req.titleHi() != null ? req.titleHi() : "[प्रस्तावित] " + req.code());
        rule.setCategory(req.category() != null ? req.category() : "CARE_AND_SUPPORT");
        rule.setTriggerType(req.triggerType() != null ? req.triggerType() : "ART_START_DATE");
        rule.setTriggerParams(req.triggerParams() != null ? req.triggerParams() : "{}");
        rule.setIntervalSpec(req.intervalSpec() != null ? req.intervalSpec() : "{}");
        rule.setPurposeCode(req.purposeCode());
        try {
            rule.setSuggestedServiceCodes(objectMapper.writeValueAsString(req.suggestedServiceCodes() != null ? req.suggestedServiceCodes() : List.of()));
        } catch (JsonProcessingException e) {
            rule.setSuggestedServiceCodes("[]");
        }
        rule.setSourceName(req.sourceName() != null ? req.sourceName() : "NACO Operational Guidelines");
        rule.setSourceEdition(req.sourceEdition() != null ? req.sourceEdition() : "Edition 2025");
        rule.setSourceUrl(req.sourceUrl());
        rule.setSourceSection(req.sourceSection());
        rule.setScope(req.scope() != null ? req.scope() : "NATIONAL");
        rule.setStatus("DRAFT");
        rule.setCreatedBy(userEmail);
        rule.setChangeNote(req.changeNote() != null ? req.changeNote() : "Initial draft creation");

        FollowUpRule saved = ruleRepository.save(rule);
        recordHistory(saved, userEmail, "DRAFT created: " + rule.getChangeNote());
        return toDto(saved);
    }

    @Transactional
    public RuleDTOs.RuleDto updateDraft(UUID id, RuleDTOs.UpdateRuleRequest req, String userEmail, String userRole) {
        if ("LEADERSHIP".equalsIgnoreCase(userRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Leadership role is read-only and cannot edit rules");
        }
        FollowUpRule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rule not found"));

        if (!"DRAFT".equals(rule.getStatus()) && !"IN_REVIEW".equals(rule.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only DRAFT or IN_REVIEW rules can be updated. Current status: " + rule.getStatus());
        }

        try {
            if (req.titleEn() != null) rule.setTitleEn(req.titleEn());
            if (req.titleHi() != null) rule.setTitleHi(req.titleHi());
            if (req.category() != null) rule.setCategory(req.category());
            if (req.triggerType() != null) rule.setTriggerType(req.triggerType());
            if (req.triggerParams() != null) rule.setTriggerParams(req.triggerParams());
            if (req.intervalSpec() != null) rule.setIntervalSpec(req.intervalSpec());
            if (req.purposeCode() != null) rule.setPurposeCode(req.purposeCode());
            if (req.suggestedServiceCodes() != null) {
                rule.setSuggestedServiceCodes(objectMapper.writeValueAsString(req.suggestedServiceCodes()));
            }
            if (req.sourceName() != null) rule.setSourceName(req.sourceName());
            if (req.sourceEdition() != null) rule.setSourceEdition(req.sourceEdition());
            if (req.sourceUrl() != null) rule.setSourceUrl(req.sourceUrl());
            if (req.sourceSection() != null) rule.setSourceSection(req.sourceSection());
            if (req.scope() != null) rule.setScope(req.scope());
            rule.setChangeNote(req.changeNote());
            rule.setUpdatedAt(Instant.now());

            FollowUpRule updated = ruleRepository.saveAndFlush(rule);
            recordHistory(updated, userEmail, "Draft updated: " + req.changeNote());
            return toDto(updated);
        } catch (OptimisticLockingFailureException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Concurrent modification detected on rule. Please refresh.");
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid JSON in suggested service codes");
        }
    }

    @Transactional
    public RuleDTOs.RuleDto submitForReview(UUID id, String userEmail, String userRole, String note) {
        if ("LEADERSHIP".equalsIgnoreCase(userRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Leadership role cannot submit rules");
        }
        FollowUpRule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rule not found"));

        if (!"DRAFT".equals(rule.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only DRAFT rules can be submitted for review. Current status: " + rule.getStatus());
        }

        rule.setStatus("IN_REVIEW");
        rule.setReviewedBy(userEmail);
        rule.setChangeNote(note != null ? note : "Submitted for peer review");
        rule.setUpdatedAt(Instant.now());

        FollowUpRule updated = ruleRepository.save(rule);
        recordHistory(updated, userEmail, "Submitted for review: " + rule.getChangeNote());
        return toDto(updated);
    }

    @Transactional
    public RuleDTOs.RuleDto approveRule(UUID id, String approverEmail, String userRole, String note) {
        if ("LEADERSHIP".equalsIgnoreCase(userRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Leadership role is read-only and cannot approve rules");
        }
        FollowUpRule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rule not found"));

        // TWO-PERSON APPROVAL CHECK: Author cannot approve their own rule
        if (rule.getCreatedBy() != null && rule.getCreatedBy().equalsIgnoreCase(approverEmail.trim())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Author cannot approve their own rule. Two-person approval required.");
        }

        if (!"IN_REVIEW".equals(rule.getStatus()) && !"DRAFT".equals(rule.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only DRAFT or IN_REVIEW rules can be approved. Current status: " + rule.getStatus());
        }

        try {
            rule.setStatus("APPROVED");
            rule.setApprovedBy(approverEmail.trim());
            rule.setApprovedAt(Instant.now());
            rule.setChangeNote(note != null ? note : "Two-person approved by " + approverEmail);
            rule.setUpdatedAt(Instant.now());

            FollowUpRule updated = ruleRepository.saveAndFlush(rule);
            recordHistory(updated, approverEmail, "Rule APPROVED: " + rule.getChangeNote());
            return toDto(updated);
        } catch (OptimisticLockingFailureException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Concurrent modification detected during rule approval.");
        }
    }

    @Transactional
    public RuleDTOs.RuleDto activateRule(UUID id, RuleDTOs.ActivateRuleRequest req, String userEmail, String userRole) {
        if ("LEADERSHIP".equalsIgnoreCase(userRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Leadership role cannot activate rules");
        }
        FollowUpRule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rule not found"));

        if (!"APPROVED".equals(rule.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only APPROVED rules can be activated. Current status: " + rule.getStatus());
        }

        try {
            rule.setStatus("ACTIVE");
            rule.setEffectiveFrom(req.effectiveFrom() != null ? req.effectiveFrom() : Instant.now());
            rule.setEffectiveTo(req.effectiveTo());
            rule.setChangeNote(req.note() != null ? req.note() : "Activated in force");
            rule.setUpdatedAt(Instant.now());

            FollowUpRule updated = ruleRepository.saveAndFlush(rule);
            recordHistory(updated, userEmail, "Rule ACTIVATED: " + rule.getChangeNote());
            return toDto(updated);
        } catch (OptimisticLockingFailureException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Concurrent modification detected during rule activation.");
        }
    }

    @Transactional
    public RuleDTOs.RuleDto retireRule(UUID id, String userEmail, String userRole, String note) {
        if ("LEADERSHIP".equalsIgnoreCase(userRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Leadership role cannot retire rules");
        }
        FollowUpRule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rule not found"));

        rule.setStatus("RETIRED");
        rule.setEffectiveTo(Instant.now());
        rule.setChangeNote(note != null ? note : "Retired from active service");
        rule.setUpdatedAt(Instant.now());

        FollowUpRule updated = ruleRepository.save(rule);
        recordHistory(updated, userEmail, "Rule RETIRED: " + rule.getChangeNote());
        return toDto(updated);
    }

    public RuleDTOs.RuleExportPackage exportRules(String userEmail) {
        List<FollowUpRule> allRules = ruleRepository.findAll();
        List<RuleDTOs.RuleDto> ruleDtos = allRules.stream().map(this::toDto).toList();
        try {
            String json = objectMapper.writeValueAsString(ruleDtos);
            String checksum = calculateSha256(json);
            return new RuleDTOs.RuleExportPackage(
                    "csc2.follow_up_rule.v1",
                    Instant.now(),
                    userEmail,
                    checksum,
                    ruleDtos
            );
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to export rules to JSON", e);
        }
    }

    @Transactional
    public List<RuleDTOs.RuleDto> importRules(RuleDTOs.RuleExportPackage pack, boolean dryRun, String userEmail, String userRole) {
        if ("LEADERSHIP".equalsIgnoreCase(userRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Leadership role cannot import rules");
        }
        if (pack.rules() == null || pack.rules().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Import package has no rules");
        }

        // Validate checksum
        try {
            String json = objectMapper.writeValueAsString(pack.rules());
            String computedChecksum = calculateSha256(json);
            if (pack.sha256Checksum() != null && !pack.sha256Checksum().equalsIgnoreCase(computedChecksum)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Package checksum mismatch. Expected: " + pack.sha256Checksum() + " but computed: " + computedChecksum);
            }
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Failed to serialize import rules for checksum validation");
        }

        List<RuleDTOs.RuleDto> results = new ArrayList<>();
        for (RuleDTOs.RuleDto dto : pack.rules()) {
            if (dryRun) {
                results.add(dto);
            } else {
                Optional<FollowUpRule> existingOpt = ruleRepository.findByCode(dto.code());
                FollowUpRule rule = existingOpt.orElseGet(FollowUpRule::new);
                rule.setCode(dto.code());
                rule.setTitleEn(dto.titleEn());
                rule.setTitleHi(dto.titleHi());
                rule.setCategory(dto.category());
                rule.setTriggerType(dto.triggerType());
                rule.setTriggerParams(dto.triggerParams());
                rule.setIntervalSpec(dto.intervalSpec());
                rule.setPurposeCode(dto.purposeCode());
                rule.setSuggestedServiceCodes(dto.suggestedServiceCodes());
                rule.setSourceName(dto.sourceName());
                rule.setSourceEdition(dto.sourceEdition());
                rule.setSourceUrl(dto.sourceUrl());
                rule.setSourceSection(dto.sourceSection());
                rule.setStatus("DRAFT"); // Imported rules always start as DRAFT
                rule.setScope(dto.scope());
                rule.setCreatedBy(userEmail);
                rule.setChangeNote("Imported from package: " + pack.schemaVersion());
                rule.setUpdatedAt(Instant.now());

                FollowUpRule saved = ruleRepository.save(rule);
                recordHistory(saved, userEmail, "Rule imported as DRAFT");
                results.add(toDto(saved));
            }
        }
        return results;
    }

    @Transactional
    public RuleDTOs.ClientTagDto attachClientTag(UUID clientId, RuleDTOs.AttachTagRequest req, String userEmail) {
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Client not found"));

        if (req.tagType() == null || req.eventDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tagType and eventDate are required");
        }

        ClientTrackingTag tag = new ClientTrackingTag(
                client,
                req.tagType(),
                req.eventDate(),
                req.notes(),
                userEmail
        );
        ClientTrackingTag saved = tagRepository.save(tag);
        return new RuleDTOs.ClientTagDto(
                saved.getId(),
                client.getId(),
                saved.getTagType(),
                saved.getEventDate(),
                saved.getNotes(),
                saved.getCreatedBy(),
                saved.getCreatedAt()
        );
    }

    public List<RuleDTOs.ClientTagDto> getClientTags(UUID clientId) {
        return tagRepository.findByClientIdOrderByEventDateDesc(clientId).stream()
                .map(t -> new RuleDTOs.ClientTagDto(
                        t.getId(),
                        t.getClient().getId(),
                        t.getTagType(),
                        t.getEventDate(),
                        t.getNotes(),
                        t.getCreatedBy(),
                        t.getCreatedAt()
                )).toList();
    }

    @Transactional
    public RuleDTOs.ApplicationAdditionDto updateApplicationAddition(UUID clientId, RuleDTOs.UpdateApplicationAdditionRequest req, String userEmail) {
        if (!clientRepository.existsById(clientId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Client not found");
        }

        ClientApplicationAddition addition = additionRepository.findByClientId(clientId)
                .orElseGet(() -> new ClientApplicationAddition(clientId));

        addition.setEnabled(req.enabled());
        addition.setLastArtCentreContactDate(req.lastArtCentreContactDate());
        addition.setArtCentreNextDueDate(req.artCentreNextDueDate());
        addition.setLatestViralLoadDate(req.latestViralLoadDate());
        addition.setPregnancyStatus(req.pregnancyStatus());
        addition.setExpectedDeliveryDate(req.expectedDeliveryDate());
        addition.setInfantDob(req.infantDob());
        addition.setUpdatedBy(userEmail);
        addition.setUpdatedAt(Instant.now());

        ClientApplicationAddition saved = additionRepository.save(addition);
        return new RuleDTOs.ApplicationAdditionDto(
                saved.getClientId(),
                saved.isEnabled(),
                saved.getLastArtCentreContactDate(),
                saved.getArtCentreNextDueDate(),
                saved.getLatestViralLoadDate(),
                saved.getPregnancyStatus(),
                saved.getExpectedDeliveryDate(),
                saved.getInfantDob(),
                saved.getUpdatedBy(),
                saved.getUpdatedAt()
        );
    }

    public RuleDTOs.ApplicationAdditionDto getApplicationAddition(UUID clientId) {
        return additionRepository.findByClientId(clientId)
                .map(saved -> new RuleDTOs.ApplicationAdditionDto(
                        saved.getClientId(),
                        saved.isEnabled(),
                        saved.getLastArtCentreContactDate(),
                        saved.getArtCentreNextDueDate(),
                        saved.getLatestViralLoadDate(),
                        saved.getPregnancyStatus(),
                        saved.getExpectedDeliveryDate(),
                        saved.getInfantDob(),
                        saved.getUpdatedBy(),
                        saved.getUpdatedAt()
                ))
                .orElse(new RuleDTOs.ApplicationAdditionDto(clientId, false, null, null, null, null, null, null, null, null));
    }

    @Transactional
    public RuleDTOs.ArtCentreImportResult importArtCentrePriorityList(RuleDTOs.ArtCentreImportRequest req, String userEmail) {
        if (req.csvContent() == null || req.csvContent().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CSV content cannot be empty");
        }

        String sha256 = calculateSha256(req.csvContent());
        String[] lines = req.csvContent().split("\\r?\\n");
        int totalRows = 0;
        int validRows = 0;
        int invalidRows = 0;
        List<String> errors = new ArrayList<>();

        // Expected header format: clientRef,artNumber,lastContactDate,nextDueDate,priorityReason
        boolean headerSeen = false;
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) continue;
            if (!headerSeen) {
                headerSeen = true;
                continue; // skip header row
            }
            totalRows++;
            String[] parts = line.split(",", -1);
            if (parts.length < 5) {
                invalidRows++;
                errors.add("Row " + (i + 1) + ": Insufficient columns (expected 5, found " + parts.length + ")");
                continue;
            }

            String clientRef = parts[0].trim();
            String artNumber = parts[1].trim();
            String lastContactStr = parts[2].trim();
            String nextDueStr = parts[3].trim();
            String reason = parts[4].trim();

            LocalDate lastContact = null;
            LocalDate nextDue = null;
            try {
                if (!lastContactStr.isEmpty()) lastContact = LocalDate.parse(lastContactStr);
                if (!nextDueStr.isEmpty()) nextDue = LocalDate.parse(nextDueStr);
            } catch (DateTimeParseException e) {
                invalidRows++;
                errors.add("Row " + (i + 1) + ": Invalid date format (use YYYY-MM-DD)");
                continue;
            }

            Optional<Client> clientOpt = clientRepository.findByClientRef(clientRef);
            if (clientOpt.isEmpty()) {
                invalidRows++;
                errors.add("Row " + (i + 1) + ": Beneficiary reference not found: " + clientRef);
                continue;
            }

            validRows++;
            if (!req.dryRun()) {
                Client client = clientOpt.get();
                ClientApplicationAddition add = additionRepository.findByClientId(client.getId())
                        .orElseGet(() -> new ClientApplicationAddition(client.getId()));
                add.setEnabled(true);
                if (lastContact != null) add.setLastArtCentreContactDate(lastContact);
                if (nextDue != null) add.setArtCentreNextDueDate(nextDue);
                add.setUpdatedBy(userEmail);
                add.setUpdatedAt(Instant.now());
                additionRepository.save(add);

                // Add tracking tag if reason matches
                if ("LOST_TO_FOLLOW_UP".equalsIgnoreCase(reason) || "MISSED_VISIT".equalsIgnoreCase(reason) || "BROUGHT_BACK".equalsIgnoreCase(reason)) {
                    ClientTrackingTag tag = new ClientTrackingTag(
                            client,
                            reason.toUpperCase(),
                            nextDue != null ? nextDue : LocalDate.now(),
                            "Imported from ART-Centre list: " + req.filename(),
                            userEmail
                    );
                    tagRepository.save(tag);
                }
            }
        }

        ArtCentrePriorityImport record = new ArtCentrePriorityImport();
        record.setFilename(req.filename());
        record.setSha256Hash(sha256);
        record.setTotalRows(totalRows);
        record.setValidRows(validRows);
        record.setInvalidRows(invalidRows);
        record.setDryRun(req.dryRun());
        record.setImportedBy(userEmail);
        record.setStatus(invalidRows == 0 ? "SUCCESS" : validRows > 0 ? "PARTIAL_SUCCESS" : "FAILED");
        try {
            record.setValidationErrors(objectMapper.writeValueAsString(errors));
        } catch (JsonProcessingException e) {
            record.setValidationErrors("[]");
        }

        ArtCentrePriorityImport saved = importRepository.save(record);
        return new RuleDTOs.ArtCentreImportResult(
                saved.getId(),
                saved.getFilename(),
                saved.getSha256Hash(),
                saved.getTotalRows(),
                saved.getValidRows(),
                saved.getInvalidRows(),
                saved.isDryRun(),
                saved.getImportedBy(),
                saved.getStatus(),
                errors
        );
    }

    private RuleDTOs.RuleDto toDto(FollowUpRule r) {
        return new RuleDTOs.RuleDto(
                r.getId(),
                r.getCode(),
                r.getTitleEn(),
                r.getTitleHi(),
                r.getCategory(),
                r.getTriggerType(),
                r.getTriggerParams(),
                r.getIntervalSpec(),
                r.getPurposeCode(),
                r.getSuggestedServiceCodes(),
                r.getSourceName(),
                r.getSourceEdition(),
                r.getSourceUrl(),
                r.getSourceSection(),
                r.getStatus(),
                r.getVersion(),
                r.getEffectiveFrom(),
                r.getEffectiveTo(),
                r.getScope(),
                r.getCreatedBy(),
                r.getReviewedBy(),
                r.getApprovedBy(),
                r.getApprovedAt(),
                r.getChangeNote(),
                r.isAutoCreateTasks(),
                r.getCreatedAt(),
                r.getUpdatedAt()
        );
    }
}
