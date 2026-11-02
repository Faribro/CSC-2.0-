package org.allianceindia.csc2.controller;

import org.allianceindia.csc2.dto.DTOs;
import org.allianceindia.csc2.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<DTOs.LoginResponse> login(@RequestBody DTOs.LoginRequest request) {
        DTOs.LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }
}
