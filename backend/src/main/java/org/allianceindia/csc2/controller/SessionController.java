package org.allianceindia.csc2.controller;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.allianceindia.csc2.config.UserPrincipal;
import org.allianceindia.csc2.domain.UserSession;
import org.allianceindia.csc2.service.SessionManagementService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/auth/session")
public class SessionController {

    private final SessionManagementService sessionService;

    public SessionController(SessionManagementService sessionService) {
        this.sessionService = sessionService;
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentSession(
            @AuthenticationPrincipal UserPrincipal user) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated session");
        }
        return ResponseEntity.ok(Map.of(
                "actorId", user.getId(),
                "username", user.getUsername(),
                "role", user.getRole(),
                "authorizedCenters", user.getAuthorizedCenters()
        ));
    }

    @PostMapping("/refresh")
    public ResponseEntity<SessionManagementService.SessionTokens> refreshSession(
            @RequestBody(required = false) Map<String, String> body,
            HttpServletRequest request,
            HttpServletResponse response) {

        String refreshToken = null;
        if (body != null && body.containsKey("refreshToken")) {
            refreshToken = body.get("refreshToken");
        }
        if (refreshToken == null && request.getCookies() != null) {
            for (Cookie c : request.getCookies()) {
                if ("csc_refresh".equals(c.getName())) {
                    refreshToken = c.getValue();
                    break;
                }
            }
        }

        if (refreshToken == null || refreshToken.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Refresh token required");
        }

        SessionManagementService.SessionTokens tokens = sessionService.rotateRefreshSession(
                refreshToken, request.getHeader("User-Agent"), request.getRemoteAddr()
        );

        setAuthCookies(response, tokens);
        return ResponseEntity.ok(tokens);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            HttpServletRequest request,
            HttpServletResponse response) {

        String sessionToken = extractSessionToken(request);
        if (sessionToken != null) {
            sessionService.revokeSession(sessionToken);
        }

        clearAuthCookies(response);
        return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "Logged out successfully"));
    }

    @PostMapping("/revoke-all")
    public ResponseEntity<Map<String, String>> revokeAll(
            @AuthenticationPrincipal UserPrincipal user,
            HttpServletResponse response) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }

        sessionService.revokeAllSessionsForUser(user.getId());
        clearAuthCookies(response);
        return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "All active sessions revoked"));
    }

    private String extractSessionToken(HttpServletRequest request) {
        if (request.getCookies() != null) {
            for (Cookie c : request.getCookies()) {
                if ("csc_session".equals(c.getName())) {
                    return c.getValue();
                }
            }
        }
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7).trim();
        }
        return null;
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

    private void clearAuthCookies(HttpServletResponse response) {
        ResponseCookie clearSession = ResponseCookie.from("csc_session", "")
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build();

        ResponseCookie clearRefresh = ResponseCookie.from("csc_refresh", "")
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, clearSession.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, clearRefresh.toString());
    }
}
