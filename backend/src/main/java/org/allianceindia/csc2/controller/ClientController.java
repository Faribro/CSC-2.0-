package org.allianceindia.csc2.controller;

import org.allianceindia.csc2.config.UserPrincipal;
import org.allianceindia.csc2.dto.DTOs;
import org.allianceindia.csc2.service.ClientQueryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/clients")
public class ClientController {

    private final ClientQueryService clientQueryService;

    public ClientController(ClientQueryService clientQueryService) {
        this.clientQueryService = clientQueryService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<DTOs.ClientDetailResponse> getClientDetail(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal user) {
        DTOs.ClientDetailResponse response = clientQueryService.getClientDetail(id, user);
        return ResponseEntity.ok(response);
    }
}
