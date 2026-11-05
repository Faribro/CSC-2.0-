package org.allianceindia.csc2.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public class RuleDTOs {

    public record RuleDto(
            UUID id,
            String code,
            String titleEn,
            String titleHi,
            String category,
            String triggerType,
            String triggerParams,
            String intervalSpec,
            String purposeCode,
            String suggestedServiceCodes,
            String sourceName,
            String sourceEdition,
            String sourceUrl,
            String sourceSection,
            String status,
            int version,
            Instant effectiveFrom,
            Instant effectiveTo,
            String scope,
            String createdBy,
            String reviewedBy,
            String approvedBy,
            Instant approvedAt,
            String changeNote,
            boolean autoCreateTasks,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record CreateRuleRequest(
            String code,
            String titleEn,
            String titleHi,
            String category,
            String triggerType,
            String triggerParams,
            String intervalSpec,
            String purposeCode,
            List<String> suggestedServiceCodes,
            String sourceName,
            String sourceEdition,
            String sourceUrl,
            String sourceSection,
            String scope,
            String changeNote
    ) {}

    public record UpdateRuleRequest(
            String titleEn,
            String titleHi,
            String category,
            String triggerType,
            String triggerParams,
            String intervalSpec,
            String purposeCode,
            List<String> suggestedServiceCodes,
            String sourceName,
            String sourceEdition,
            String sourceUrl,
            String sourceSection,
            String scope,
            String changeNote
    ) {}

    public record ApproveRuleRequest(
            String approverEmail,
            String approvalNote
    ) {}

    public record ActivateRuleRequest(
            Instant effectiveFrom,
            Instant effectiveTo,
            String note
    ) {}

    public record RuleHistoryDto(
            UUID id,
            UUID ruleId,
            int version,
            String status,
            String ruleSnapshot,
            String changedBy,
            String changeNote,
            Instant createdAt
    ) {}

    public record RuleSuggestionDto(
            UUID id,
            UUID taskId,
            UUID clientId,
            String clientRef,
            String clientName,
            UUID ruleId,
            String ruleCode,
            String ruleTitleEn,
            String ruleTitleHi,
            int ruleVersion,
            String sourceName,
            String sourceEdition,
            LocalDate suggestedDate,
            String suggestedPurpose,
            String suggestedPurposeLabelEn,
            String suggestedPurposeLabelHi,
            List<String> suggestedServiceCodes,
            String explanationEn,
            String explanationHi,
            String datesUsed,
            String outcome,
            String dismissedReason,
            String decidedBy,
            Instant decidedAt,
            Instant createdAt
    ) {}

    public record SuggestionDecisionRequest(
            String outcome, // ACCEPTED, EDITED, DISMISSED
            LocalDate customDate,
            String customPurpose,
            List<String> customServiceCodes,
            String dismissedReason,
            String decidedBy
    ) {}

    public record AttachTagRequest(
            String tagType, // 'NEWLY_STARTED', 'MISSED_VISIT', 'LOST_TO_FOLLOW_UP', 'BROUGHT_BACK'
            LocalDate eventDate,
            String notes
    ) {}

    public record ClientTagDto(
            UUID id,
            UUID clientId,
            String tagType,
            LocalDate eventDate,
            String notes,
            String createdBy,
            Instant createdAt
    ) {}

    public record ApplicationAdditionDto(
            UUID clientId,
            boolean enabled,
            LocalDate lastArtCentreContactDate,
            LocalDate artCentreNextDueDate,
            LocalDate latestViralLoadDate,
            String pregnancyStatus,
            LocalDate expectedDeliveryDate,
            LocalDate infantDob,
            String updatedBy,
            Instant updatedAt
    ) {}

    public record UpdateApplicationAdditionRequest(
            boolean enabled,
            LocalDate lastArtCentreContactDate,
            LocalDate artCentreNextDueDate,
            LocalDate latestViralLoadDate,
            String pregnancyStatus,
            LocalDate expectedDeliveryDate,
            LocalDate infantDob
    ) {}

    public record ComputedLabelDto(
            String id,
            String labelEn,
            String labelHi,
            String ruleCode,
            String severity, // 'info', 'warning', 'critical'
            String icon,
            int daysCount,
            boolean dismissable
    ) {}

    public record DueWithoutTaskSummary(
            UUID clientId,
            String clientRef,
            String clientName,
            String centerId,
            UUID ruleId,
            String ruleCode,
            String ruleTitleEn,
            String ruleTitleHi,
            LocalDate suggestedDate,
            long daysOverdueAgainstRule,
            String explanationEn,
            String explanationHi
    ) {}

    public record RuleExportPackage(
            String schemaVersion,
            Instant exportedAt,
            String exportedBy,
            String sha256Checksum,
            List<RuleDto> rules
    ) {}

    public record ArtCentreImportRequest(
            String filename,
            String csvContent,
            boolean dryRun
    ) {}

    public record ArtCentreImportResult(
            UUID id,
            String filename,
            String sha256Hash,
            int totalRows,
            int validRows,
            int invalidRows,
            boolean isDryRun,
            String importedBy,
            String status,
            List<String> errors
    ) {}

    public record RulePreviewResult(
            UUID ruleId,
            String ruleCode,
            int syntheticClientsEvaluated,
            int suggestionsGenerated,
            List<RuleSuggestionDto> sampleSuggestions
    ) {}
}
