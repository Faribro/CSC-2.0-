package org.allianceindia.csc2.service;

import org.allianceindia.csc2.domain.*;
import org.allianceindia.csc2.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class StateManagerAuthService {

    private static final Logger log = LoggerFactory.getLogger(StateManagerAuthService.class);

    private final StateRegistrationRepository registrationRepository;
    private final StateCodeRepository stateCodeRepository;
    private final OtpChallengeRepository otpChallengeRepository;
    private final AppUserRepository appUserRepository;
    private final CryptoService cryptoService;
    private final RateLimiterService rateLimiterService;
    private final SessionManagementService sessionManagementService;
    private final NotificationService notificationService;
    private final AuditEventRepository auditEventRepository;

    private final List<String> allowlistDomains;
    private final List<String> allowlistEmails;
    private final String adminEmail;

    public StateManagerAuthService(
            StateRegistrationRepository registrationRepository,
            StateCodeRepository stateCodeRepository,
            OtpChallengeRepository otpChallengeRepository,
            AppUserRepository appUserRepository,
            CryptoService cryptoService,
            RateLimiterService rateLimiterService,
            SessionManagementService sessionManagementService,
            NotificationService notificationService,
            AuditEventRepository auditEventRepository,
            @Value("${app.security.allowlist.domains:allianceindia.org,naco.gov.in,example.org}") String allowlistDomains,
            @Value("${app.security.allowlist.emails:admin@allianceindia.org,director@allianceindia.org}") String allowlistEmails,
            @Value("${app.admin.email:admin@allianceindia.org}") String adminEmail) {
        this.registrationRepository = registrationRepository;
        this.stateCodeRepository = stateCodeRepository;
        this.otpChallengeRepository = otpChallengeRepository;
        this.appUserRepository = appUserRepository;
        this.cryptoService = cryptoService;
        this.rateLimiterService = rateLimiterService;
        this.sessionManagementService = sessionManagementService;
        this.notificationService = notificationService;
        this.auditEventRepository = auditEventRepository;

        this.allowlistDomains = Arrays.stream(allowlistDomains.split(",")).map(String::trim).map(String::toLowerCase).toList();
        this.allowlistEmails = Arrays.stream(allowlistEmails.split(",")).map(String::trim).map(String::toLowerCase).toList();
        this.adminEmail = adminEmail;
    }

    public record RegistrationRequest(
            String firstName,
            String lastName,
            String workEmail,
            String requestedState,
            String organization
    ) {}

    public record RegistrationResult(
            UUID registrationId,
            String status,
            String workEmail,
            String message,
            String encryptedEnvelope
    ) {}

    public record VerifyOtpRequest(
            String workEmail,
            String otp,
            String deviceLabel
    ) {}

    public record VerifyOtpResult(
            String status,
            String message,
            SessionManagementService.SessionTokens sessionTokens
    ) {}

    public record ResendRequest(
            String encryptedEnvelope
    ) {}

    @Transactional
    public RegistrationResult registerStateManager(RegistrationRequest req, String clientIp) {
        if (req.firstName() == null || req.firstName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "First name is required");
        }
        if (req.workEmail() == null || req.workEmail().trim().isEmpty() || !req.workEmail().contains("@")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valid work email is required");
        }
        if (req.requestedState() == null || req.requestedState().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Requested state is required");
        }
        if (req.organization() == null || req.organization().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Organization is required");
        }

        // Durable sliding window rate limit
        String rateKey = "STATE_REG:" + clientIp;
        if (!rateLimiterService.checkAndRecord(rateKey, 15, Duration.ofMinutes(15))) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many registration attempts. Please wait before retrying.");
        }

        String email = req.workEmail().trim().toLowerCase();
        String state = req.requestedState().trim();
        boolean isAllowlisted = isEmailOrDomainAllowlisted(email);

        StateRegistration registration = registrationRepository.findByWorkEmailIgnoreCase(email)
                .orElseGet(() -> new StateRegistration(
                        req.firstName(),
                        req.lastName(),
                        email,
                        state,
                        req.organization()
                ));

        registration.setFirstName(req.firstName().trim());
        registration.setLastName(req.lastName() != null ? req.lastName().trim() : "");
        registration.setRequestedState(state);
        registration.setOrganization(req.organization().trim());

        if (isAllowlisted && !"APPROVED".equals(registration.getStatus())) {
            registration.setStatus("APPROVED");
            registration.setApprovedAt(Instant.now());
            registration.setApprovedBy("SYSTEM_ALLOWLIST");
        }
        registration = registrationRepository.save(registration);

        // State Code check: exactly ONE active code per state
        Optional<StateCode> existingCodeOpt = stateCodeRepository.findByStateIgnoreCaseAndStatus(state, "ACTIVE");
        String plainStateCode = null;

        if (existingCodeOpt.isEmpty()) {
            // First signup for this state: generate ONE active code ALN-<STATE>-XXXX-XXXX
            plainStateCode = cryptoService.generateStateCode(state);
            String verifier = cryptoService.computeStateCodeVerifier(plainStateCode);
            StateCode newCode = new StateCode(
                    registration,
                    state,
                    verifier,
                    50,
                    Instant.now().plus(30, ChronoUnit.DAYS)
            );
            stateCodeRepository.save(newCode);
        }

        // Durable OTP Challenge: 6 digits, 10 minutes, salt + SHA-256 hash
        String otp = cryptoService.generate6DigitOtp();
        String salt = cryptoService.generateSaltHex();
        String otpHash = cryptoService.hashOtp(otp, salt);

        OtpChallenge challenge = new OtpChallenge(
                email,
                otpHash,
                salt,
                Instant.now().plus(10, ChronoUnit.MINUTES)
        );
        otpChallengeRepository.save(challenge);

        // Notification: enqueue personal OTP + state code (clearly separated)
        Map<String, Object> payload = new HashMap<>();
        payload.put("firstName", registration.getFirstName());
        payload.put("state", state);
        payload.put("otp", otp);
        if (plainStateCode != null) {
            payload.put("stateCode", plainStateCode);
        }
        payload.put("workEmail", email);

        notificationService.enqueueEmail(email, "STATE_MANAGER_SIGNUP", payload);
        notificationService.processPendingNotifications(); // Fast synchronous dispatch for local dev

        // Encrypted envelope for short-lived resend requests (fail closed if envelope secret absent)
        String envelopePlaintext = registration.getId().toString() + ":" + email + ":" + Instant.now().toEpochMilli();
        String envelope = cryptoService.encryptEnvelope(envelopePlaintext);

        return new RegistrationResult(
                registration.getId(),
                registration.getStatus(),
                email,
                "Verification code dispatched to " + email,
                envelope
        );
    }

    @Transactional(noRollbackFor = ResponseStatusException.class)
    public VerifyOtpResult verifyOtp(VerifyOtpRequest req, String clientIp) {
        if (req.workEmail() == null || req.otp() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email and OTP verification code are required");
        }

        String email = req.workEmail().trim().toLowerCase();
        String rateKey = "OTP_VERIFY:" + email;

        if (!rateLimiterService.checkAndRecord(rateKey, 20, Duration.ofMinutes(15))) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many verification attempts. Please wait.");
        }

        StateRegistration registration = registrationRepository.findByWorkEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No registration found for " + email));

        OtpChallenge challenge = otpChallengeRepository.findTopByEmailIgnoreCaseAndConsumedAtIsNullOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "No active verification challenge found. Please request a new code."));

        if (challenge.isExpired()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verification code has expired (10 minute limit). Please request a new code.");
        }

        if (challenge.getAttempts() >= 5) {
            throw new ResponseStatusException(HttpStatus.LOCKED, "Verification challenge locked due to 5 consecutive failed attempts.");
        }

        boolean isValid = cryptoService.verifyOtp(req.otp(), challenge.getOtpHash(), challenge.getSalt());

        if (!isValid) {
            challenge.setAttempts(challenge.getAttempts() + 1);
            otpChallengeRepository.save(challenge);
            int remaining = 5 - challenge.getAttempts();
            if (remaining <= 0) {
                throw new ResponseStatusException(HttpStatus.LOCKED, "Too many failed attempts. Verification challenge locked.");
            }
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid verification code. " + remaining + " attempts remaining.");
        }

        // OTP verified successfully!
        challenge.setConsumedAt(Instant.now());
        otpChallengeRepository.save(challenge);

        registration.setEmailVerifiedAt(Instant.now());
        if (isEmailOrDomainAllowlisted(email) && !"APPROVED".equals(registration.getStatus())) {
            registration.setStatus("APPROVED");
            registration.setApprovedAt(Instant.now());
            registration.setApprovedBy("SYSTEM_ALLOWLIST");
        }
        registrationRepository.save(registration);

        if ("APPROVED".equals(registration.getStatus())) {
            // Establish authenticated session
            AppUser user = appUserRepository.findByEmailIgnoreCase(email)
                    .orElseGet(() -> new AppUser(
                            email,
                            email,
                            registration.getFirstName(),
                            registration.getLastName(),
                            "STATE_REVIEWER",
                            registration.getRequestedState()
                    ));
            user.setRole("STATE_REVIEWER");
            user.setState(registration.getRequestedState());
            user = appUserRepository.save(user);

            SessionManagementService.SessionTokens tokens = sessionManagementService.createSession(
                    user, req.deviceLabel() != null ? req.deviceLabel() : "Browser Session", clientIp
            );

            return new VerifyOtpResult("APPROVED", "Authentication successful.", tokens);
        } else {
            // PENDING_APPROVAL: Dispatches notification to administrator with deep link
            Map<String, Object> adminPayload = Map.of(
                    "applicantName", registration.getFirstName() + " " + registration.getLastName(),
                    "applicantEmail", email,
                    "state", registration.getRequestedState(),
                    "organization", registration.getOrganization(),
                    "registrationId", registration.getId().toString()
            );
            notificationService.enqueueEmail(adminEmail, "ADMIN_APPROVAL_REQUEST", adminPayload);
            notificationService.processPendingNotifications();

            return new VerifyOtpResult(
                    "PENDING_APPROVAL",
                    "Email verified. Your registration is awaiting administrator approval.",
                    null
            );
        }
    }

    @Transactional
    public RegistrationResult resendOtp(ResendRequest req, String clientIp) {
        if (req.encryptedEnvelope() == null || req.encryptedEnvelope().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Encrypted envelope is required");
        }

        // Audited & rate-limited resend
        String rateKey = "RESEND:" + clientIp;
        if (!rateLimiterService.checkAndRecord(rateKey, 5, Duration.ofMinutes(15))) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many resend attempts. Please wait.");
        }

        String decrypted;
        try {
            decrypted = cryptoService.decryptEnvelope(req.encryptedEnvelope());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired resend envelope");
        }

        String[] parts = decrypted.split(":");
        if (parts.length < 3) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Malformed envelope");
        }

        UUID regId = UUID.fromString(parts[0]);
        String email = parts[1];
        long timestamp = Long.parseLong(parts[2]);

        // Max 15 minutes envelope validity
        if (Instant.now().toEpochMilli() - timestamp > 15 * 60 * 1000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Resend envelope expired. Please re-register.");
        }

        StateRegistration registration = registrationRepository.findById(regId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Registration not found"));

        // Resending the OTP NEVER rotates or duplicates the state code!
        String otp = cryptoService.generate6DigitOtp();
        String salt = cryptoService.generateSaltHex();
        String otpHash = cryptoService.hashOtp(otp, salt);

        OtpChallenge challenge = new OtpChallenge(
                email,
                otpHash,
                salt,
                Instant.now().plus(10, ChronoUnit.MINUTES)
        );
        otpChallengeRepository.save(challenge);

        // Audit resend
        AuditEvent audit = new AuditEvent(
                null, email, registration.getRequestedState(),
                "STATE_MANAGER_OTP_RESENT", "STATE_REGISTRATION", registration.getId(),
                clientIp, "{\"reason\":\"User requested resend via envelope\"}"
        );
        auditEventRepository.save(audit);

        // Enqueue email
        Map<String, Object> payload = Map.of(
                "firstName", registration.getFirstName(),
                "state", registration.getRequestedState(),
                "otp", otp,
                "workEmail", email
        );
        notificationService.enqueueEmail(email, "STATE_MANAGER_SIGNUP", payload);
        notificationService.processPendingNotifications();

        String newEnvelope = cryptoService.encryptEnvelope(registration.getId().toString() + ":" + email + ":" + Instant.now().toEpochMilli());

        return new RegistrationResult(
                registration.getId(),
                registration.getStatus(),
                email,
                "Verification code re-sent successfully.",
                newEnvelope
        );
    }

    private boolean isEmailOrDomainAllowlisted(String email) {
        if (email == null) return false;
        String lower = email.trim().toLowerCase();
        if (allowlistEmails.contains(lower)) return true;
        int atIdx = lower.lastIndexOf('@');
        if (atIdx != -1) {
            String domain = lower.substring(atIdx + 1);
            return allowlistDomains.contains(domain);
        }
        return false;
    }
}
