package org.allianceindia.csc2.service;

import org.allianceindia.csc2.domain.AppUser;
import org.allianceindia.csc2.domain.UserSession;
import org.allianceindia.csc2.repository.UserSessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class SessionManagementService {

    private static final Logger log = LoggerFactory.getLogger(SessionManagementService.class);

    public static final int IDLE_EXPIRY_DAYS = 30; // Sliding 30 days
    public static final int ABSOLUTE_CAP_DAYS = 90; // Hard cap 90 days

    private final UserSessionRepository sessionRepository;
    private final CryptoService cryptoService;
    private final SecureRandom secureRandom = new SecureRandom();

    public SessionManagementService(UserSessionRepository sessionRepository, CryptoService cryptoService) {
        this.sessionRepository = sessionRepository;
        this.cryptoService = cryptoService;
    }

    public record SessionTokens(String sessionToken, String refreshToken, UUID sessionId, AppUser user) {}

    @Transactional
    public SessionTokens createSession(AppUser user, String deviceLabel, String ipAddress) {
        String sessionToken = generateSecureTokenHex(32);
        String refreshToken = generateSecureTokenHex(32);

        String sessionHash = cryptoService.sha256Hex(sessionToken);
        String refreshHash = cryptoService.sha256Hex(refreshToken);

        Instant now = Instant.now();
        Instant idleExpiry = now.plus(IDLE_EXPIRY_DAYS, ChronoUnit.DAYS);
        Instant absoluteExpiry = now.plus(ABSOLUTE_CAP_DAYS, ChronoUnit.DAYS);

        UserSession session = new UserSession(
                user, sessionHash, refreshHash, deviceLabel, ipAddress, idleExpiry, absoluteExpiry
        );
        session = sessionRepository.save(session);

        return new SessionTokens(sessionToken, refreshToken, session.getId(), user);
    }

    @Transactional
    public Optional<UserSession> validateSession(String rawSessionToken) {
        if (rawSessionToken == null || rawSessionToken.trim().isEmpty()) {
            return Optional.empty();
        }

        String hash = cryptoService.sha256Hex(rawSessionToken.trim());
        Optional<UserSession> opt = sessionRepository.findBySessionTokenHashAndRevokedAtIsNull(hash);
        if (opt.isEmpty()) {
            return Optional.empty();
        }

        UserSession session = opt.get();
        if (session.isExpired()) {
            session.setRevokedAt(Instant.now());
            sessionRepository.save(session);
            return Optional.empty();
        }

        // Slide idle expiration
        session.setLastUsedAt(Instant.now());
        session.setIdleExpiresAt(Instant.now().plus(IDLE_EXPIRY_DAYS, ChronoUnit.DAYS));
        sessionRepository.save(session);

        return Optional.of(session);
    }

    @Transactional(noRollbackFor = SecurityException.class)
    public SessionTokens rotateRefreshSession(String rawRefreshToken, String deviceLabel, String ipAddress) {
        if (rawRefreshToken == null || rawRefreshToken.trim().isEmpty()) {
            throw new IllegalArgumentException("Refresh token is required");
        }

        String hash = cryptoService.sha256Hex(rawRefreshToken.trim());
        Optional<UserSession> opt = sessionRepository.findByRefreshTokenHash(hash);

        if (opt.isEmpty()) {
            throw new SecurityException("Invalid refresh token");
        }

        UserSession session = opt.get();

        // REUSE DETECTION: If this refresh token's session was already revoked, token reuse / theft occurred!
        if (session.isRevoked()) {
            log.warn("SECURITY ALERT: Refresh token reuse detected for user {}. Revoking all active sessions.",
                    session.getUser().getUsername());
            revokeAllSessionsForUser(session.getUser().getId());
            throw new SecurityException("Refresh token reuse detected. All sessions revoked for security.");
        }

        if (session.isExpired()) {
            session.setRevokedAt(Instant.now());
            sessionRepository.save(session);
            throw new SecurityException("Session has expired");
        }

        // Revoke the old session to prevent reuse
        session.setRevokedAt(Instant.now());
        sessionRepository.save(session);

        // Generate new token pair and create new active session row
        String newSessionToken = generateSecureTokenHex(32);
        String newRefreshToken = generateSecureTokenHex(32);

        String newSessionHash = cryptoService.sha256Hex(newSessionToken);
        String newRefreshHash = cryptoService.sha256Hex(newRefreshToken);

        UserSession newSession = new UserSession();
        newSession.setUser(session.getUser());
        newSession.setSessionTokenHash(newSessionHash);
        newSession.setRefreshTokenHash(newRefreshHash);
        newSession.setLastUsedAt(Instant.now());
        newSession.setIdleExpiresAt(Instant.now().plus(IDLE_EXPIRY_DAYS, ChronoUnit.DAYS));
        newSession.setAbsoluteExpiresAt(session.getAbsoluteExpiresAt());
        newSession.setDeviceLabel(deviceLabel != null ? deviceLabel : session.getDeviceLabel());
        newSession.setIpAddress(ipAddress != null ? ipAddress : session.getIpAddress());

        sessionRepository.save(newSession);

        return new SessionTokens(newSessionToken, newRefreshToken, newSession.getId(), newSession.getUser());
    }

    @Transactional
    public void revokeSession(String rawSessionToken) {
        if (rawSessionToken == null) return;
        String hash = cryptoService.sha256Hex(rawSessionToken.trim());
        sessionRepository.findBySessionTokenHashAndRevokedAtIsNull(hash).ifPresent(s -> {
            s.setRevokedAt(Instant.now());
            sessionRepository.save(s);
        });
    }

    @Transactional
    public void revokeAllSessionsForUser(UUID userId) {
        List<UserSession> active = sessionRepository.findByUserIdAndRevokedAtIsNull(userId);
        for (UserSession s : active) {
            s.setRevokedAt(Instant.now());
        }
        sessionRepository.saveAll(active);
    }

    private String generateSecureTokenHex(int byteCount) {
        byte[] bytes = new byte[byteCount];
        secureRandom.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }
}
