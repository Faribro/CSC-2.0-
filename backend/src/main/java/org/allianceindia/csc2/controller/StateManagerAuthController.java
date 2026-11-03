package org.allianceindia.csc2.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.allianceindia.csc2.service.SessionManagementService;
import org.allianceindia.csc2.service.StateManagerAuthService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth/state-manager")
public class StateManagerAuthController {

    private final StateManagerAuthService authService;

    public StateManagerAuthController(StateManagerAuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<StateManagerAuthService.RegistrationResult> register(
            @RequestBody StateManagerAuthService.RegistrationRequest request,
            HttpServletRequest httpRequest) {
        StateManagerAuthService.RegistrationResult result = authService.registerStateManager(
                request, httpRequest.getRemoteAddr()
        );
        return ResponseEntity.ok(result);
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<StateManagerAuthService.VerifyOtpResult> verifyOtp(
            @RequestBody StateManagerAuthService.VerifyOtpRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        StateManagerAuthService.VerifyOtpResult result = authService.verifyOtp(
                request, httpRequest.getRemoteAddr()
        );

        if (result.sessionTokens() != null) {
            setAuthCookies(httpResponse, result.sessionTokens());
        }

        return ResponseEntity.ok(result);
    }

    @PostMapping("/resend")
    public ResponseEntity<StateManagerAuthService.RegistrationResult> resendOtp(
            @RequestBody StateManagerAuthService.ResendRequest request,
            HttpServletRequest httpRequest) {
        StateManagerAuthService.RegistrationResult result = authService.resendOtp(
                request, httpRequest.getRemoteAddr()
        );
        return ResponseEntity.ok(result);
    }

    private void setAuthCookies(HttpServletResponse response, SessionManagementService.SessionTokens tokens) {
        ResponseCookie sessionCookie = ResponseCookie.from("csc_session", tokens.sessionToken())
                .httpOnly(true)
                .secure(false) // local / same-host
                .sameSite("Lax")
                .path("/")
                .maxAge(30 * 24 * 3600) // 30 days
                .build();

        ResponseCookie refreshCookie = ResponseCookie.from("csc_refresh", tokens.refreshToken())
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/")
                .maxAge(90 * 24 * 3600) // 90 days
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, sessionCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
    }
}
