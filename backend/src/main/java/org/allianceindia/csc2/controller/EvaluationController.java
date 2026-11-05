package org.allianceindia.csc2.controller;

import jakarta.servlet.http.HttpServletResponse;
import org.allianceindia.csc2.config.UserPrincipal;
import org.allianceindia.csc2.domain.StateReference;
import org.allianceindia.csc2.dto.DTOs;
import org.allianceindia.csc2.service.EvaluationService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/evaluation")
public class EvaluationController {

    private final EvaluationService evaluationService;

    public EvaluationController(EvaluationService evaluationService) {
        this.evaluationService = evaluationService;
    }

    @GetMapping("/states")
    public ResponseEntity<List<StateReference>> getStates() {
        return ResponseEntity.ok(evaluationService.getActiveStates());
    }

    @PostMapping("/state-team/signup")
    public ResponseEntity<EvaluationService.AuthResponse> stateTeamSignup(
            @RequestBody EvaluationService.StateTeamSignupRequest req,
            HttpServletResponse response) {
        EvaluationService.AuthResponse auth = evaluationService.signupStateTeam(req);
        setJwtCookie(response, auth.token());
        return ResponseEntity.ok(auth);
    }

    @PostMapping("/state-team/login")
    public ResponseEntity<EvaluationService.AuthResponse> stateTeamLogin(
            @RequestBody EvaluationService.StateTeamLoginRequest req,
            HttpServletResponse response) {
        EvaluationService.AuthResponse auth = evaluationService.loginStateTeam(req);
        setJwtCookie(response, auth.token());
        return ResponseEntity.ok(auth);
    }

    @PostMapping("/leadership/request-otp")
    public ResponseEntity<Map<String, String>> leadershipRequestOtp(
            @RequestBody EvaluationService.LeadershipOtpRequest req) {
        return ResponseEntity.ok(evaluationService.requestLeadershipOtp(req.email()));
    }

    @PostMapping("/leadership/verify-otp")
    public ResponseEntity<EvaluationService.AuthResponse> leadershipVerifyOtp(
            @RequestBody EvaluationService.LeadershipVerifyRequest req,
            HttpServletResponse response) {
        EvaluationService.AuthResponse auth = evaluationService.verifyLeadershipOtp(req.email(), req.otp());
        setJwtCookie(response, auth.token());
        return ResponseEntity.ok(auth);
    }

    private void setJwtCookie(HttpServletResponse response, String jwt) {
        if (jwt == null) return;
        ResponseCookie cookie = ResponseCookie.from("csc_jwt", jwt)
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/")
                .maxAge(30 * 24 * 3600)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    // ROSTER MANAGEMENT
    @GetMapping("/roster")
    public ResponseEntity<List<EvaluationService.RosterEntryDto>> getRoster(
            @RequestParam(required = false) String state,
            @AuthenticationPrincipal UserPrincipal user) {
        String effectiveState = state;
        if (user != null && !"LEADERSHIP".equalsIgnoreCase(user.getRole()) && !"SYSTEM_ADMIN".equalsIgnoreCase(user.getRole())) {
            // Constrain to user's assigned state if present
            if (user.getAuthorizedCenters() != null && !user.getAuthorizedCenters().isEmpty()) {
                effectiveState = user.getAuthorizedCenters().get(0).replace("CENTER_", "");
            }
        }
        return ResponseEntity.ok(evaluationService.getRoster(effectiveState));
    }

    @PostMapping("/roster")
    public ResponseEntity<EvaluationService.RosterEntryDto> addRosterEntry(
            @RequestBody EvaluationService.AddRosterRequest req,
            @AuthenticationPrincipal UserPrincipal user) {
        String addedBy = user != null ? user.getUsername() : "state_admin";
        return ResponseEntity.ok(evaluationService.addRosterEntry(req, addedBy));
    }

    @PostMapping("/roster/bulk")
    public ResponseEntity<EvaluationService.BulkRosterResult> bulkAddRoster(
            @RequestBody Map<String, String> payload,
            @AuthenticationPrincipal UserPrincipal user) {
        String csv = payload.getOrDefault("csv", "");
        String state = payload.getOrDefault("state", "NATIONAL");
        String district = payload.getOrDefault("district", "General");
        String addedBy = user != null ? user.getUsername() : "state_admin";
        return ResponseEntity.ok(evaluationService.bulkAddRoster(csv, state, district, addedBy));
    }

    @PutMapping("/roster/{id}/toggle-status")
    public ResponseEntity<Map<String, String>> toggleRosterStatus(@PathVariable UUID id) {
        evaluationService.toggleRosterStatus(id);
        return ResponseEntity.ok(Map.of("message", "Status updated successfully"));
    }

    @DeleteMapping("/roster/{id}")
    public ResponseEntity<Map<String, String>> deleteRosterEntry(@PathVariable UUID id) {
        evaluationService.deleteRosterEntry(id);
        return ResponseEntity.ok(Map.of("message", "Roster entry removed successfully"));
    }

    // STATE SUPERVISION / EVALUATION DASHBOARD
    @GetMapping("/stats")
    public ResponseEntity<EvaluationService.EvaluationStats> getStats(
            @RequestParam(required = false) String state,
            @AuthenticationPrincipal UserPrincipal user) {
        String effectiveState = state;
        if (effectiveState == null && user != null && !"LEADERSHIP".equalsIgnoreCase(user.getRole())) {
            if (user.getAuthorizedCenters() != null && !user.getAuthorizedCenters().isEmpty()) {
                effectiveState = user.getAuthorizedCenters().get(0).replace("CENTER_", "");
            }
        }
        return ResponseEntity.ok(evaluationService.getStats(effectiveState));
    }

    @GetMapping("/surveys")
    public ResponseEntity<DTOs.ClientListResponse> getEvaluationSurveys(
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal user) {
        String effectiveState = state;
        if (effectiveState == null && user != null && !"LEADERSHIP".equalsIgnoreCase(user.getRole())) {
            if (user.getAuthorizedCenters() != null && !user.getAuthorizedCenters().isEmpty()) {
                effectiveState = user.getAuthorizedCenters().get(0).replace("CENTER_", "");
            }
        }
        return ResponseEntity.ok(evaluationService.getEvaluationSurveys(effectiveState, search, page, size));
    }

    @GetMapping("/supervision")
    public ResponseEntity<List<EvaluationService.SupervisionTaskDto>> getSupervision(
            @RequestParam(defaultValue = "OVERDUE") String view,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) UUID workerId,
            @RequestParam(required = false) Integer threshold,
            @AuthenticationPrincipal UserPrincipal user) {
        String effectiveState = state;
        if (effectiveState == null && user != null && !"LEADERSHIP".equalsIgnoreCase(user.getRole())) {
            if (user.getAuthorizedCenters() != null && !user.getAuthorizedCenters().isEmpty()) {
                effectiveState = user.getAuthorizedCenters().get(0).replace("CENTER_", "");
            }
        }
        return ResponseEntity.ok(evaluationService.getSupervisionTasks(view, effectiveState, district, workerId, threshold));
    }

    @PostMapping("/tasks/{id}/reassign")
    public ResponseEntity<DTOs.ActionReceipt> reassignTask(
            @PathVariable UUID id,
            @RequestBody EvaluationService.ReassignTaskRequest req,
            @AuthenticationPrincipal UserPrincipal user,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        DTOs.ActionReceipt receipt = evaluationService.reassignTask(id, req, user, httpRequest.getRemoteAddr());
        return ResponseEntity.ok(receipt);
    }
}
