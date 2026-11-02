package org.allianceindia.csc2.controller;

import org.allianceindia.csc2.config.UserPrincipal;
import org.allianceindia.csc2.dto.DTOs;
import org.allianceindia.csc2.service.WorklistService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/work")
public class WorklistController {

    private final WorklistService worklistService;

    public WorklistController(WorklistService worklistService) {
        this.worklistService = worklistService;
    }

    @GetMapping
    public ResponseEntity<DTOs.WorklistResponse> getWorklist(
            @AuthenticationPrincipal UserPrincipal user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        DTOs.WorklistResponse response = worklistService.getWorklist(user, date);
        return ResponseEntity.ok(response);
    }
}
