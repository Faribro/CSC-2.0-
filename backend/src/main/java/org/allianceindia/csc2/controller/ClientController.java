package org.allianceindia.csc2.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.allianceindia.csc2.config.UserPrincipal;
import org.allianceindia.csc2.dto.DTOs;
import org.allianceindia.csc2.service.ClientProfileService;
import org.allianceindia.csc2.service.ClientQueryService;
import org.allianceindia.csc2.service.ClientService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/clients")
public class ClientController {

    private final ClientQueryService clientQueryService;
    private final ClientService clientService;
    private final ClientProfileService clientProfileService;

    public ClientController(ClientQueryService clientQueryService,
                            ClientService clientService,
                            ClientProfileService clientProfileService) {
        this.clientQueryService = clientQueryService;
        this.clientService = clientService;
        this.clientProfileService = clientProfileService;
    }

    @PostMapping
    public ResponseEntity<DTOs.ActionReceipt> registerClient(
            @RequestBody DTOs.RegisterClientRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal user,
            HttpServletRequest httpRequest) {
        DTOs.ActionReceipt receipt = clientService.registerClient(
                request, user, idempotencyKey, httpRequest.getRemoteAddr()
        );
        return ResponseEntity.ok(receipt);
    }

    @GetMapping
    public ResponseEntity<DTOs.ClientListResponse> listClients(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal user) {
        DTOs.ClientListResponse response = clientService.listClients(user, search, page, size);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DTOs.ClientDetailResponse> getClientDetail(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal user) {
        DTOs.ClientDetailResponse response = clientQueryService.getClientDetail(id, user);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/profile")
    public ResponseEntity<DTOs.ClientProfileDto> getClientProfile(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal user) {
        DTOs.ClientProfileDto profile = clientProfileService.getClientProfile(id, user);
        return ResponseEntity.ok(profile);
    }

    @PutMapping("/{id}/profile")
    public ResponseEntity<DTOs.ActionReceipt> updateClientProfile(
            @PathVariable UUID id,
            @RequestBody DTOs.UpdateProfileRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal user,
            HttpServletRequest httpRequest) {
        DTOs.ActionReceipt receipt = clientProfileService.updateClientProfile(
                id, request, user, idempotencyKey, httpRequest.getRemoteAddr()
        );
        return ResponseEntity.ok(receipt);
    }
}
