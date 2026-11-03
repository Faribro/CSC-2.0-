package org.allianceindia.csc2.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.allianceindia.csc2.config.UserPrincipal;
import org.allianceindia.csc2.service.AdminRegistrationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/registrations")
public class AdminRegistrationController {

    private final AdminRegistrationService adminService;

    public AdminRegistrationController(AdminRegistrationService adminService) {
        this.adminService = adminService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'LEADERSHIP')")
    public ResponseEntity<List<AdminRegistrationService.RegistrationDetail>> listRegistrations() {
        return ResponseEntity.ok(adminService.listPendingRegistrations());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'LEADERSHIP')")
    public ResponseEntity<AdminRegistrationService.RegistrationDetail> getRegistration(@PathVariable UUID id) {
        return ResponseEntity.ok(adminService.getRegistrationById(id));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<AdminRegistrationService.RegistrationDetail> approveRegistration(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal admin,
            HttpServletRequest request) {
        if (admin == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Administrator authentication required");
        }
        AdminRegistrationService.RegistrationDetail result = adminService.approveRegistration(
                id, admin.getUsername(), request.getRemoteAddr()
        );
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<AdminRegistrationService.RegistrationDetail> rejectRegistration(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal admin,
            HttpServletRequest request) {
        if (admin == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Administrator authentication required");
        }
        String reason = body != null ? body.get("reason") : "Policy requirements not satisfied";
        AdminRegistrationService.RegistrationDetail result = adminService.rejectRegistration(
                id, admin.getUsername(), reason, request.getRemoteAddr()
        );
        return ResponseEntity.ok(result);
    }
}
