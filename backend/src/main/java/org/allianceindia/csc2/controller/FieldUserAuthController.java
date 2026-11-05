package org.allianceindia.csc2.controller;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.allianceindia.csc2.domain.FieldUser;
import org.allianceindia.csc2.service.FieldUserAuthService;
import org.allianceindia.csc2.service.FieldUserOnboardingService;
import org.allianceindia.csc2.service.SessionManagementService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/auth")
public class FieldUserAuthController {

    private final FieldUserOnboardingService fieldService;
    private final FieldUserAuthService phoneAuthService;

    public FieldUserAuthController(FieldUserOnboardingService fieldService,
                                   FieldUserAuthService phoneAuthService) {
        this.fieldService = fieldService;
        this.phoneAuthService = phoneAuthService;
    }

    public record SendPhoneOtpRequest(String phone, String deviceId) {}
    public record VerifyPhoneOtpRequest(String phone, String code, String enrolmentToken, String firstName, String lastName, String deviceId) {
        public VerifyPhoneOtpRequest(String phone, String code, String firstName, String lastName, String deviceId) {
            this(phone, code, null, firstName, lastName, deviceId);
        }
    }

    // PHONE-BASED VERIFICATION (PRIMARY FOR FIELD CASEWORKERS)
    @PostMapping("/field/send-otp")
    public ResponseEntity<FieldUserAuthService.SendPhoneOtpResult> sendPhoneOtp(
            @RequestBody SendPhoneOtpRequest req,
            HttpServletRequest httpRequest) {
        FieldUserAuthService.SendPhoneOtpResult result = phoneAuthService.sendPhoneOtp(
                req.phone(), httpRequest.getRemoteAddr(), req.deviceId()
        );
        return ResponseEntity.ok(result);
    }

    @PostMapping("/field/verify-otp")
    public ResponseEntity<FieldUserAuthService.VerifyPhoneOtpResult> verifyPhoneOtp(
            @RequestBody VerifyPhoneOtpRequest req,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        FieldUserAuthService.VerifyPhoneOtpResult result = phoneAuthService.verifyPhoneOtp(
                req.phone(), req.code(), req.enrolmentToken(), req.firstName(), req.lastName(), req.deviceId(), httpRequest.getRemoteAddr()
        );

        if (result.success() && result.tokens() != null) {
            setDeviceSessionCookies(httpResponse, result.tokens());
        }

        return ResponseEntity.ok(result);
    }

    @GetMapping("/field/session")
    public ResponseEntity<?> getFieldSession(HttpServletRequest request) {
        String sessionToken = extractDeviceSessionToken(request);
        if (sessionToken == null) {
            return ResponseEntity.status(401).body(Map.of("authenticated", false, "message", "No device session"));
        }

        Optional<FieldUser> userOpt = phoneAuthService.validateDeviceSession(sessionToken);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("authenticated", false, "message", "Invalid or expired session"));
        }

        FieldUser u = userOpt.get();
        return ResponseEntity.ok(Map.of(
                "authenticated", true,
                "id", u.getId(),
                "firstName", u.getFirstName(),
                "lastName", u.getLastName(),
                "phone", u.getPhoneE164(),
                "status", u.getStatus(),
                "state", u.getState() != null ? u.getState() : "",
                "district", u.getDistrict() != null ? u.getDistrict() : ""
        ));
    }

    @PostMapping("/field/logout")
    public ResponseEntity<?> logout(HttpServletResponse response) {
        ResponseCookie clearSession = ResponseCookie.from("csc2_device_session", "")
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, clearSession.toString());
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    // LEGACY GOOGLE ONBOARDING COMPATIBILITY
    @PostMapping("/google/login")
    public ResponseEntity<FieldUserOnboardingService.GoogleAuthResult> googleLogin(
            @RequestBody FieldUserOnboardingService.GoogleIdentity identity,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        FieldUserOnboardingService.GoogleAuthResult result = fieldService.processGoogleAuth(
                identity, httpRequest.getHeader("User-Agent"), httpRequest.getRemoteAddr()
        );

        if (!result.isNewUser() && result.sessionTokens() != null) {
            setLegacyAuthCookies(httpResponse, result.sessionTokens());
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

        setLegacyAuthCookies(httpResponse, tokens);
        return ResponseEntity.ok(tokens);
    }

    private void setDeviceSessionCookies(HttpServletResponse response, FieldUserAuthService.DeviceSessionTokens tokens) {
        ResponseCookie sessionCookie = ResponseCookie.from("csc2_device_session", tokens.sessionToken())
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/")
                .maxAge(30 * 24 * 3600)
                .build();

        ResponseCookie refreshCookie = ResponseCookie.from("csc2_device_refresh", tokens.refreshToken())
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/")
                .maxAge(90 * 24 * 3600)
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, sessionCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
    }

    private void setLegacyAuthCookies(HttpServletResponse response, SessionManagementService.SessionTokens tokens) {
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

    private String extractDeviceSessionToken(HttpServletRequest request) {
        String header = request.getHeader("X-Device-Session");
        if (header != null && !header.trim().isEmpty()) {
            return header.trim();
        }
        if (request.getCookies() != null) {
            for (Cookie c : request.getCookies()) {
                if ("csc2_device_session".equals(c.getName())) {
                    return c.getValue();
                }
            }
        }
        return null;
    }
}
