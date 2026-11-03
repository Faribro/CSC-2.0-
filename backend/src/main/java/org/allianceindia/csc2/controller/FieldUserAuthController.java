package org.allianceindia.csc2.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.allianceindia.csc2.service.FieldUserOnboardingService;
import org.allianceindia.csc2.service.SessionManagementService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class FieldUserAuthController {

    private final FieldUserOnboardingService fieldService;

    public FieldUserAuthController(FieldUserOnboardingService fieldService) {
        this.fieldService = fieldService;
    }

    @PostMapping("/google/login")
    public ResponseEntity<FieldUserOnboardingService.GoogleAuthResult> googleLogin(
            @RequestBody FieldUserOnboardingService.GoogleIdentity identity,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        FieldUserOnboardingService.GoogleAuthResult result = fieldService.processGoogleAuth(
                identity, httpRequest.getHeader("User-Agent"), httpRequest.getRemoteAddr()
        );

        if (!result.isNewUser() && result.sessionTokens() != null) {
            setAuthCookies(httpResponse, result.sessionTokens());
        }

        return ResponseEntity.ok(result);
    }

    @PostMapping("/field-user/complete")
    public ResponseEntity<SessionManagementService.SessionTokens> completeOnboarding(
            @RequestBody FieldUserOnboardingService.CompleteOnboardingRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        SessionManagementService.SessionTokens tokens = fieldService.completeOnboarding(
                request, httpRequest.getRemoteAddr()
        );

        setAuthCookies(httpResponse, tokens);
        return ResponseEntity.ok(tokens);
    }

    private void setAuthCookies(HttpServletResponse response, SessionManagementService.SessionTokens tokens) {
        ResponseCookie sessionCookie = ResponseCookie.from("csc_session", tokens.sessionToken())
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/")
                .maxAge(30 * 24 * 3600)
                .build();

        ResponseCookie refreshCookie = ResponseCookie.from("csc_refresh", tokens.refreshToken())
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/")
                .maxAge(90 * 24 * 3600)
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, sessionCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
    }
}
