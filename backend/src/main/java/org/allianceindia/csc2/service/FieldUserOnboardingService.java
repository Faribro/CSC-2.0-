package org.allianceindia.csc2.service;

import org.allianceindia.csc2.domain.*;
import org.allianceindia.csc2.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class FieldUserOnboardingService {

    private static final Logger log = LoggerFactory.getLogger(FieldUserOnboardingService.class);

    private final StateCodeRepository stateCodeRepository;
    private final FieldProfileRepository fieldProfileRepository;
    private final AppUserRepository appUserRepository;
    private final SessionManagementService sessionManagementService;
    private final CryptoService cryptoService;
    private final AuditEventRepository auditEventRepository;

    public FieldUserOnboardingService(
            StateCodeRepository stateCodeRepository,
            FieldProfileRepository fieldProfileRepository,
            AppUserRepository appUserRepository,
            SessionManagementService sessionManagementService,
            CryptoService cryptoService,
            AuditEventRepository auditEventRepository) {
        this.stateCodeRepository = stateCodeRepository;
        this.fieldProfileRepository = fieldProfileRepository;
        this.appUserRepository = appUserRepository;
        this.sessionManagementService = sessionManagementService;
        this.cryptoService = cryptoService;
        this.auditEventRepository = auditEventRepository;
    }

    public record GoogleIdentity(
            String googleSub,
            String email,
            String givenName,
            String familyName
    ) {}

    public record GoogleAuthResult(
            boolean isNewUser,
            String onboardingTicket,
            String email,
            String firstName,
            String lastName,
            SessionManagementService.SessionTokens sessionTokens
    ) {}

    public record CompleteOnboardingRequest(
            String onboardingTicket,
            String firstName,
            String lastName,
            String district,
            String stateCode,
            String deviceLabel
    ) {}

    @Transactional
    public GoogleAuthResult processGoogleAuth(GoogleIdentity identity, String deviceLabel, String clientIp) {
        if (identity.googleSub() == null || identity.email() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid Google profile information");
        }

        // Check if field user already exists
        Optional<FieldProfile> existingProfileOpt = fieldProfileRepository.findByGoogleSub(identity.googleSub());
        if (existingProfileOpt.isPresent()) {
            // RETURNING USER: establish session immediately!
            // Crucial: Returning logins NEVER consume or check the state code!
            FieldProfile profile = existingProfileOpt.get();
            AppUser user = profile.getUser();

            SessionManagementService.SessionTokens tokens = sessionManagementService.createSession(
                    user, deviceLabel != null ? deviceLabel : "Field Mobile Device", clientIp
            );

            log.info("Returning field user login successful: {} ({})", user.getUsername(), profile.getState());
            return new GoogleAuthResult(false, null, user.getEmail(), profile.getFirstName(), profile.getLastName(), tokens);
        }

        // FIRST-TIME USER: issue signed onboarding ticket
        String ticketPayload = identity.googleSub() + ":" + identity.email() + ":" +
                (identity.givenName() != null ? identity.givenName() : "") + ":" +
                (identity.familyName() != null ? identity.familyName() : "") + ":" +
                Instant.now().toEpochMilli();
        String ticket = cryptoService.encryptEnvelope(ticketPayload);

        return new GoogleAuthResult(
                true,
                ticket,
                identity.email(),
                identity.givenName() != null ? identity.givenName() : "",
                identity.familyName() != null ? identity.familyName() : "",
                null
        );
    }

    @Transactional
    public SessionManagementService.SessionTokens completeOnboarding(
            CompleteOnboardingRequest req, String clientIp) {

        if (req.onboardingTicket() == null || req.onboardingTicket().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Onboarding ticket is required");
        }
        if (req.firstName() == null || req.firstName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "First name is required");
        }
        if (req.district() == null || req.district().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assigned district is required");
        }
        if (req.stateCode() == null || req.stateCode().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "State invitation code is required");
        }

        // Decrypt onboarding ticket
        String decrypted;
        try {
            decrypted = cryptoService.decryptEnvelope(req.onboardingTicket());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired onboarding ticket. Please re-authenticate.");
        }

        String[] parts = decrypted.split(":");
        if (parts.length < 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Malformed onboarding ticket");
        }

        String googleSub = parts[0];
        String googleEmail = parts[1];
        long ticketTime = Long.parseLong(parts[4]);

        // Max 30 minutes ticket validity
        if (Instant.now().toEpochMilli() - ticketTime > 30 * 60 * 1000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Onboarding ticket expired (30 minute limit). Please re-authenticate.");
        }

        // Check if user was concurrently registered
        if (fieldProfileRepository.findByGoogleSub(googleSub).isPresent()) {
            AppUser existing = appUserRepository.findByEmailIgnoreCase(googleEmail)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "User profile discrepancy"));
            return sessionManagementService.createSession(existing, req.deviceLabel(), clientIp);
        }

        // Compute HMAC verifier of normalized state code
        String normalizedCode = cryptoService.normalizeCode(req.stateCode());
        String codeVerifier = cryptoService.computeStateCodeVerifier(normalizedCode);

        // Atomic redemption with row-level pessimistic write lock (SELECT ... FOR UPDATE)
        StateCode stateCode = stateCodeRepository.findByCodeVerifierForUpdate(codeVerifier)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid state invitation code. Please check code or contact your state coordinator."));

        // Validate code status
        if (!"ACTIVE".equals(stateCode.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "State invitation code is " + stateCode.getStatus() + ".");
        }

        // Validate expiry
        if (stateCode.isExpired()) {
            stateCode.setStatus("EXPIRED");
            stateCodeRepository.save(stateCode);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "State invitation code has expired.");
        }

        // Validate coordinator verified and approved
        StateRegistration coordReg = stateCode.getStateRegistration();
        if (coordReg == null || !"APPROVED".equals(coordReg.getStatus()) || coordReg.getEmailVerifiedAt() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "State coordinator registration is pending administrative approval. Code cannot be redeemed.");
        }

        // Validate redemption limit (atomic concurrency check)
        if (stateCode.getRedemptionCount() >= stateCode.getMaxRedemptions()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "State invitation code redemption limit (" + stateCode.getMaxRedemptions() + ") has been reached.");
        }

        // Atomically increment redemption counter
        stateCode.setRedemptionCount(stateCode.getRedemptionCount() + 1);
        stateCodeRepository.save(stateCode);

        // Provision AppUser
        AppUser user = appUserRepository.findByEmailIgnoreCase(googleEmail)
                .orElseGet(() -> new AppUser(
                        googleEmail,
                        googleEmail,
                        req.firstName().trim(),
                        req.lastName() != null ? req.lastName().trim() : "",
                        "FIELD_WORKER",
                        stateCode.getState()
                ));
        user.setRole("FIELD_WORKER");
        user.setState(stateCode.getState());
        user = appUserRepository.save(user);

        // Provision FieldProfile
        FieldProfile profile = new FieldProfile(
                user,
                req.firstName().trim(),
                req.lastName() != null ? req.lastName().trim() : "",
                stateCode.getState(), // State is fixed by the code!
                req.district().trim(),
                googleSub,
                stateCode
        );
        fieldProfileRepository.save(profile);

        // Immutable Audit Event
        AuditEvent audit = new AuditEvent(
                user.getId(), user.getUsername(), stateCode.getState(),
                "FIELD_USER_ONBOARDED", "FIELD_PROFILE", profile.getId(),
                clientIp, String.format("{\"state\":\"%s\",\"district\":\"%s\",\"codeId\":\"%s\"}",
                        stateCode.getState(), profile.getDistrict(), stateCode.getId())
        );
        auditEventRepository.save(audit);

        // Establish session with mobile-app feel
        return sessionManagementService.createSession(
                user, req.deviceLabel() != null ? req.deviceLabel() : "Field Mobile App", clientIp
        );
    }
}
