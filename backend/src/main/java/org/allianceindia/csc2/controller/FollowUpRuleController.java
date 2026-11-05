package org.allianceindia.csc2.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.allianceindia.csc2.config.UserPrincipal;
import org.allianceindia.csc2.dto.RuleDTOs;
import org.allianceindia.csc2.service.FollowUpRuleService;
import org.allianceindia.csc2.service.RuleEngineService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class FollowUpRuleController {

    private final FollowUpRuleService ruleService;
    private final RuleEngineService ruleEngineService;

    public FollowUpRuleController(FollowUpRuleService ruleService, RuleEngineService ruleEngineService) {
        this.ruleService = ruleService;
        this.ruleEngineService = ruleEngineService;
    }

    private String getEffectiveUserEmail(UserPrincipal user) {
        if (user != null && user.getUsername() != null && !user.getUsername().isEmpty()) {
            return user.getUsername();
        }
        return "admin.user@allianceindia.org";
    }

    private String getEffectiveUserRole(UserPrincipal user) {
        if (user != null && user.getRole() != null) {
            return user.getRole();
        }
        return "SYSTEM_ADMIN";
    }

    private UUID getEffectiveActorId(UserPrincipal user) {
        if (user != null && user.getId() != null) {
            return user.getId();
        }
        return UUID.fromString("00000000-0000-0000-0000-000000000001");
    }

    // ==========================================
    // 1. RULE LIFECYCLE & REPOSITORY
    // ==========================================

    @GetMapping("/rules")
    public ResponseEntity<List<RuleDTOs.RuleDto>> listRules(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String scope
    ) {
        return ResponseEntity.ok(ruleService.listRules(status, category, scope));
    }

    @GetMapping("/rules/in-force")
    public ResponseEntity<List<RuleDTOs.RuleDto>> getActiveRulesInForce(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant asOf
    ) {
        return ResponseEntity.ok(ruleService.getActiveRulesInForce(asOf));
    }

    @GetMapping("/rules/{id}")
    public ResponseEntity<RuleDTOs.RuleDto> getRule(@PathVariable UUID id) {
        return ResponseEntity.ok(ruleService.getRuleById(id));
    }

    @GetMapping("/rules/{id}/history")
    public ResponseEntity<List<RuleDTOs.RuleHistoryDto>> getRuleHistory(@PathVariable UUID id) {
        return ResponseEntity.ok(ruleService.getRuleHistory(id));
    }

    @PostMapping("/rules")
    public ResponseEntity<RuleDTOs.RuleDto> createRule(
            @RequestBody RuleDTOs.CreateRuleRequest req,
            @AuthenticationPrincipal UserPrincipal user
    ) {
        return ResponseEntity.ok(ruleService.createRule(req, getEffectiveUserEmail(user), getEffectiveUserRole(user)));
    }

    @PutMapping("/rules/{id}")
    public ResponseEntity<RuleDTOs.RuleDto> updateDraft(
            @PathVariable UUID id,
            @RequestBody RuleDTOs.UpdateRuleRequest req,
            @AuthenticationPrincipal UserPrincipal user
    ) {
        return ResponseEntity.ok(ruleService.updateDraft(id, req, getEffectiveUserEmail(user), getEffectiveUserRole(user)));
    }

    @PostMapping("/rules/{id}/submit")
    public ResponseEntity<RuleDTOs.RuleDto> submitForReview(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal user
    ) {
        String note = body != null ? body.get("note") : null;
        return ResponseEntity.ok(ruleService.submitForReview(id, getEffectiveUserEmail(user), getEffectiveUserRole(user), note));
    }

    @PostMapping("/rules/{id}/approve")
    public ResponseEntity<RuleDTOs.RuleDto> approveRule(
            @PathVariable UUID id,
            @RequestBody(required = false) RuleDTOs.ApproveRuleRequest req,
            @AuthenticationPrincipal UserPrincipal user
    ) {
        String approverEmail = req != null && req.approverEmail() != null ? req.approverEmail() : getEffectiveUserEmail(user);
        String note = req != null ? req.approvalNote() : "Approved";
        return ResponseEntity.ok(ruleService.approveRule(id, approverEmail, getEffectiveUserRole(user), note));
    }

    @PostMapping("/rules/{id}/activate")
    public ResponseEntity<RuleDTOs.RuleDto> activateRule(
            @PathVariable UUID id,
            @RequestBody(required = false) RuleDTOs.ActivateRuleRequest req,
            @AuthenticationPrincipal UserPrincipal user
    ) {
        RuleDTOs.ActivateRuleRequest effectiveReq = req != null ? req : new RuleDTOs.ActivateRuleRequest(Instant.now(), null, "Activated");
        return ResponseEntity.ok(ruleService.activateRule(id, effectiveReq, getEffectiveUserEmail(user), getEffectiveUserRole(user)));
    }

    @PostMapping("/rules/{id}/retire")
    public ResponseEntity<RuleDTOs.RuleDto> retireRule(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal user
    ) {
        String note = body != null ? body.get("note") : null;
        return ResponseEntity.ok(ruleService.retireRule(id, getEffectiveUserEmail(user), getEffectiveUserRole(user), note));
    }

    @PostMapping("/rules/export")
    public ResponseEntity<RuleDTOs.RuleExportPackage> exportRules(@AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(ruleService.exportRules(getEffectiveUserEmail(user)));
    }

    @PostMapping("/rules/import")
    public ResponseEntity<List<RuleDTOs.RuleDto>> importRules(
            @RequestBody RuleDTOs.RuleExportPackage pack,
            @RequestParam(defaultValue = "true") boolean dryRun,
            @AuthenticationPrincipal UserPrincipal user
    ) {
        return ResponseEntity.ok(ruleService.importRules(pack, dryRun, getEffectiveUserEmail(user), getEffectiveUserRole(user)));
    }

    @PostMapping("/rules/{id}/preview")
    public ResponseEntity<RuleDTOs.RulePreviewResult> previewRule(
            @PathVariable UUID id,
            @RequestParam(required = false) String centerId
    ) {
        return ResponseEntity.ok(ruleEngineService.previewRule(id, centerId));
    }

    // ==========================================
    // 2. SUGGESTIONS & CLIENT INTERACTION
    // ==========================================

    @GetMapping("/clients/{clientId}/suggestions")
    public ResponseEntity<List<RuleDTOs.RuleSuggestionDto>> getSuggestions(
            @PathVariable UUID clientId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate
    ) {
        // Evaluates deterministic suggestions from active rules
        ruleEngineService.evaluateRulesForClient(clientId, asOfDate);
        return ResponseEntity.ok(ruleEngineService.getClientSuggestions(clientId));
    }

    @PostMapping("/clients/{clientId}/suggestions/{suggestionId}/decision")
    public ResponseEntity<RuleDTOs.RuleSuggestionDto> decideSuggestion(
            @PathVariable UUID clientId,
            @PathVariable UUID suggestionId,
            @RequestBody RuleDTOs.SuggestionDecisionRequest req,
            @AuthenticationPrincipal UserPrincipal user,
            HttpServletRequest request
    ) {
        String outcome = req.outcome() != null ? req.outcome().toUpperCase() : "ACCEPTED";
        String userEmail = getEffectiveUserEmail(user);
        UUID actorId = getEffectiveActorId(user);
        String ipAddress = request.getRemoteAddr();

        if ("EDITED".equals(outcome)) {
            return ResponseEntity.ok(ruleEngineService.editSuggestion(suggestionId, req, userEmail, actorId, ipAddress));
        } else if ("DISMISSED".equals(outcome)) {
            return ResponseEntity.ok(ruleEngineService.dismissSuggestion(suggestionId, req.dismissedReason(), userEmail, actorId, ipAddress));
        } else {
            return ResponseEntity.ok(ruleEngineService.acceptSuggestion(suggestionId, userEmail, actorId, ipAddress));
        }
    }

    @GetMapping("/clients/{clientId}/computed-labels")
    public ResponseEntity<List<RuleDTOs.ComputedLabelDto>> getComputedLabels(
            @PathVariable UUID clientId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate
    ) {
        return ResponseEntity.ok(ruleEngineService.getComputedLabels(clientId, asOfDate));
    }

    @PostMapping("/clients/{clientId}/tags")
    public ResponseEntity<RuleDTOs.ClientTagDto> attachTrackingTag(
            @PathVariable UUID clientId,
            @RequestBody RuleDTOs.AttachTagRequest req,
            @AuthenticationPrincipal UserPrincipal user
    ) {
        return ResponseEntity.ok(ruleService.attachClientTag(clientId, req, getEffectiveUserEmail(user)));
    }

    @GetMapping("/clients/{clientId}/tags")
    public ResponseEntity<List<RuleDTOs.ClientTagDto>> getTrackingTags(@PathVariable UUID clientId) {
        return ResponseEntity.ok(ruleService.getClientTags(clientId));
    }

    @GetMapping("/clients/{clientId}/validation/untraceable")
    public ResponseEntity<RuleEngineService.ValidationResult> validateUntraceable(
            @PathVariable UUID clientId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate
    ) {
        return ResponseEntity.ok(ruleEngineService.validateUntraceableCriteria(clientId, asOfDate));
    }

    @GetMapping("/clients/{clientId}/validation/opted-out")
    public ResponseEntity<RuleEngineService.ValidationResult> validateOptedOut(@PathVariable UUID clientId) {
        return ResponseEntity.ok(ruleEngineService.validateOptedOutCriteria(clientId));
    }

    @GetMapping("/clients/{clientId}/application-additions")
    public ResponseEntity<RuleDTOs.ApplicationAdditionDto> getApplicationAdditions(@PathVariable UUID clientId) {
        return ResponseEntity.ok(ruleService.getApplicationAddition(clientId));
    }

    @PostMapping("/clients/{clientId}/application-additions")
    public ResponseEntity<RuleDTOs.ApplicationAdditionDto> updateApplicationAdditions(
            @PathVariable UUID clientId,
            @RequestBody RuleDTOs.UpdateApplicationAdditionRequest req,
            @AuthenticationPrincipal UserPrincipal user
    ) {
        return ResponseEntity.ok(ruleService.updateApplicationAddition(clientId, req, getEffectiveUserEmail(user)));
    }

    // ==========================================
    // 3. SUPERVISION & CSV IMPORT
    // ==========================================

    @GetMapping("/rules/supervision/due-without-task")
    public ResponseEntity<List<RuleDTOs.DueWithoutTaskSummary>> getDueWithoutTask(
            @RequestParam(required = false) String centerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate
    ) {
        return ResponseEntity.ok(ruleEngineService.getDueWithoutTask(centerId, asOfDate));
    }

    @PostMapping("/rules/art-centre-import")
    public ResponseEntity<RuleDTOs.ArtCentreImportResult> importArtCentrePriorityList(
            @RequestBody RuleDTOs.ArtCentreImportRequest req,
            @AuthenticationPrincipal UserPrincipal user
    ) {
        return ResponseEntity.ok(ruleService.importArtCentrePriorityList(req, getEffectiveUserEmail(user)));
    }
}
