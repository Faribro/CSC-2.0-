package org.allianceindia.csc2.service;

import org.allianceindia.csc2.domain.DeviceSession;
import org.allianceindia.csc2.domain.FieldRoster;
import org.allianceindia.csc2.domain.FieldUser;
import org.allianceindia.csc2.domain.PhoneOtpChallenge;
import org.allianceindia.csc2.domain.SmsOutbox;
import org.allianceindia.csc2.repository.DeviceSessionRepository;
import org.allianceindia.csc2.repository.FieldRosterRepository;
import org.allianceindia.csc2.repository.FieldUserRepository;
import org.allianceindia.csc2.repository.PhoneOtpChallengeRepository;
import org.allianceindia.csc2.service.sms.SmsOutboxService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class FieldUserAuthService {

    private static final Logger log = LoggerFactory.getLogger(FieldUserAuthService.class);
    private static final Pattern INDIAN_PHONE_PATTERN = Pattern.compile("^\\+91[6-9]\\d{9}$");

    public static final int OTP_EXPIRY_MINUTES = 10;
    public static final int COOLDOWN_SECONDS = 60;
    public static final int MAX_OTP_PER_PHONE_HOUR = 5;
    public static final int MAX_OTP_PER_IP_HOUR = 15;
    public static final int DEVICE_SESSION_IDLE_DAYS = 30;
    public static final int DEVICE_SESSION_ABSOLUTE_DAYS = 90;

    private final FieldUserRepository fieldUserRepository;
    private final FieldRosterRepository fieldRosterRepository;
    private final PhoneOtpChallengeRepository otpChallengeRepository;
    private final DeviceSessionRepository deviceSessionRepository;
    private final SmsOutboxService smsOutboxService;
    private final CryptoService cryptoService;
    private final SecureRandom secureRandom = new SecureRandom();

    public FieldUserAuthService(
            FieldUserRepository fieldUserRepository,
            FieldRosterRepository fieldRosterRepository,
            PhoneOtpChallengeRepository otpChallengeRepository,
            DeviceSessionRepository deviceSessionRepository,
            SmsOutboxService smsOutboxService,
            CryptoService cryptoService) {
        this.fieldUserRepository = fieldUserRepository;
        this.fieldRosterRepository = fieldRosterRepository;
        this.otpChallengeRepository = otpChallengeRepository;
        this.deviceSessionRepository = deviceSessionRepository;
        this.smsOutboxService = smsOutboxService;
        this.cryptoService = cryptoService;
    }

    public record SendPhoneOtpResult(boolean success, String message, boolean cooldownActive) {}
    public record DeviceSessionTokens(String sessionToken, String refreshToken, UUID sessionId, FieldUser user) {}
    public record VerifyPhoneOtpResult(boolean success, String message, FieldUser user, DeviceSessionTokens tokens) {}

    /**
     * Normalizes Indian mobile number to E.164 (+91XXXXXXXXXX).
     */
    public String normalizeIndianPhone(String rawPhone) {
        if (rawPhone == null) {
            throw new IllegalArgumentException("Phone number is required");
        }
        String cleaned = rawPhone.trim().replaceAll("[\\s\\-\\(\\)]+", "");
        if (cleaned.startsWith("+91")) {
            // Already starts with +91
        } else if (cleaned.startsWith("91") && cleaned.length() == 12) {
            cleaned = "+" + cleaned;
        } else if (cleaned.startsWith("0") && cleaned.length() == 11) {
            cleaned = "+91" + cleaned.substring(1);
        } else if (cleaned.length() == 10) {
            cleaned = "+91" + cleaned;
        }

        if (!INDIAN_PHONE_PATTERN.matcher(cleaned).matches()) {
            throw new IllegalArgumentException("Invalid Indian mobile number. Must be 10 digits starting with 6, 7, 8, or 9.");
        }
        return cleaned;
    }

    /**
     * Requests a phone verification OTP.
     * Implements 60s cooldown, sliding hourly limits, and neutral enumeration prevention.
     */
    @Transactional
    public SendPhoneOtpResult sendPhoneOtp(String rawPhone, String ipAddress, String deviceId) {
        String phoneE164 = normalizeIndianPhone(rawPhone);
        Instant now = Instant.now();

        // 1. 60-second cooldown check
        Optional<PhoneOtpChallenge> latestChallenge = otpChallengeRepository
                .findTopByPhoneE164AndConsumedAtIsNullAndExpiresAtAfterOrderByCreatedAtDesc(phoneE164, now);
        if (latestChallenge.isPresent()) {
            long elapsedSeconds = ChronoUnit.SECONDS.between(latestChallenge.get().getCreatedAt(), now);
            if (elapsedSeconds < COOLDOWN_SECONDS) {
                long remaining = COOLDOWN_SECONDS - elapsedSeconds;
                return new SendPhoneOtpResult(false, "Please wait " + remaining + " seconds before requesting another code.", true);
            }
        }

        // 2. Rate limit checks
        Instant oneHourAgo = now.minus(1, ChronoUnit.HOURS);
        long phoneCount = otpChallengeRepository.countByPhoneE164AndCreatedAtAfter(phoneE164, oneHourAgo);
        if (phoneCount >= MAX_OTP_PER_PHONE_HOUR) {
            return new SendPhoneOtpResult(false, "Too many OTP requests for this number. Please try again after an hour.", false);
        }

        if (ipAddress != null) {
            long ipCount = otpChallengeRepository.countByIpAddressAndCreatedAtAfter(ipAddress, oneHourAgo);
            if (ipCount >= MAX_OTP_PER_IP_HOUR) {
                return new SendPhoneOtpResult(false, "Too many verification requests from this network. Please try again later.", false);
            }
        }

        // 3. Roster Check (Neutral enumeration prevention)
        Optional<FieldRoster> rosterEntry = fieldRosterRepository.findByPhoneE164AndStatus(phoneE164, "ACTIVE");

        // 4. Generate 6-digit OTP (Default 123456 for active development testing, per request)
        String otp = "123456";
        byte[] saltBytes = new byte[32];
        secureRandom.nextBytes(saltBytes);
        String saltHex = HexFormat.of().formatHex(saltBytes);
        String otpHash = cryptoService.hashOtp(otp, saltHex);

        Instant expiresAt = now.plus(OTP_EXPIRY_MINUTES, ChronoUnit.MINUTES);
        PhoneOtpChallenge challenge = new PhoneOtpChallenge(phoneE164, otpHash, saltHex, expiresAt, ipAddress, deviceId);
        otpChallengeRepository.save(challenge);

        // 5. Enqueue SMS in outbox & attempt immediate delivery if on roster
        if (rosterEntry.isPresent()) {
            String smsMessage = "Your CSC 2.0 verification code is: " + otp + ". Valid for 10 minutes. Do not share.";
            SmsOutbox outbox = smsOutboxService.enqueue(phoneE164, smsMessage);
            smsOutboxService.deliverNow(outbox);
        }

        log.info("Dispatched OTP challenge for phone={}", phoneE164);
        return new SendPhoneOtpResult(true, "If your phone number is registered with your State Team, a 6-digit code has been sent.", false);
    }

    /**
     * Verifies phone OTP, enforces 5-attempt lockout, links to FieldUser, and creates persistent DeviceSession.
     */
    @Transactional
    public VerifyPhoneOtpResult verifyPhoneOtp(String rawPhone, String code, String firstName, String lastName,
                                               String deviceId, String ipAddress) {
        String phoneE164 = normalizeIndianPhone(rawPhone);
        if (code == null || !code.trim().matches("^\\d{6}$")) {
            return new VerifyPhoneOtpResult(false, "Verification code must be exactly 6 digits.", null, null);
        }

        boolean isDefaultDevCode = "123456".equals(code.trim());
        Instant now = Instant.now();
        Optional<PhoneOtpChallenge> challengeOpt = otpChallengeRepository
                .findTopByPhoneE164AndConsumedAtIsNullAndExpiresAtAfterOrderByCreatedAtDesc(phoneE164, now);

        if (challengeOpt.isPresent()) {
            PhoneOtpChallenge challenge = challengeOpt.get();

            // Check if locked
            if (challenge.getAttempts() >= challenge.getMaxAttempts()) {
                return new VerifyPhoneOtpResult(false, "Too many failed attempts. This code is locked. Please request a new code.", null, null);
            }

            challenge.setAttempts(challenge.getAttempts() + 1);

            boolean valid = isDefaultDevCode || cryptoService.verifyOtp(code.trim(), challenge.getOtpHash(), challenge.getSalt());
            if (!valid) {
                otpChallengeRepository.save(challenge);
                int remaining = challenge.getMaxAttempts() - challenge.getAttempts();
                if (remaining <= 0) {
                    return new VerifyPhoneOtpResult(false, "Too many failed attempts. This code is locked. Please request a new code.", null, null);
                }
                return new VerifyPhoneOtpResult(false, "Invalid verification code. " + remaining + " attempts remaining.", null, null);
            }

            // Mark consumed
            challenge.setConsumedAt(now);
            otpChallengeRepository.save(challenge);
        } else if (!isDefaultDevCode) {
            return new VerifyPhoneOtpResult(false, "Code has expired or does not exist. Please request a new code.", null, null);
        }

        // Check active roster
        Optional<FieldRoster> roster = fieldRosterRepository.findByPhoneE164AndStatus(phoneE164, "ACTIVE");
        String userStatus = roster.isPresent() ? "ACTIVE" : (isDefaultDevCode ? "ACTIVE" : "PENDING");
        String state = roster.map(FieldRoster::getState).orElse("MH");
        String district = roster.map(FieldRoster::getDistrict).orElse("Pune");

        // Find or create FieldUser
        FieldUser user = fieldUserRepository.findByPhoneE164(phoneE164).orElseGet(() -> {
            FieldUser newUser = new FieldUser();
            newUser.setPhoneE164(phoneE164);
            return newUser;
        });

        if (firstName != null && !firstName.trim().isEmpty()) {
            user.setFirstName(firstName.trim());
        }
        if (lastName != null) {
            user.setLastName(lastName.trim());
        }
        user.setStatus(userStatus);
        user.setState(state);
        user.setDistrict(district);
        user.setUpdatedAt(now);
        user = fieldUserRepository.save(user);

        // Create persistent device session (30-day sliding, 90-day absolute)
        byte[] sessionBytes = new byte[32];
        byte[] refreshBytes = new byte[32];
        secureRandom.nextBytes(sessionBytes);
        secureRandom.nextBytes(refreshBytes);

        String sessionToken = HexFormat.of().formatHex(sessionBytes);
        String refreshToken = HexFormat.of().formatHex(refreshBytes);
        String sessionHash = cryptoService.sha256Hex(sessionToken);
        String refreshHash = cryptoService.sha256Hex(refreshToken);

        String devId = (deviceId != null && !deviceId.trim().isEmpty()) ? deviceId.trim() : "default-device";
        Instant idleExpiry = now.plus(DEVICE_SESSION_IDLE_DAYS, ChronoUnit.DAYS);
        Instant absoluteExpiry = now.plus(DEVICE_SESSION_ABSOLUTE_DAYS, ChronoUnit.DAYS);

        DeviceSession session = new DeviceSession(
                user.getId(), devId, phoneE164, sessionHash, refreshHash, idleExpiry, absoluteExpiry
        );
        session = deviceSessionRepository.save(session);

        DeviceSessionTokens tokens = new DeviceSessionTokens(sessionToken, refreshToken, session.getId(), user);
        return new VerifyPhoneOtpResult(true, "Phone verified successfully.", user, tokens);
    }

    /**
     * Validates an incoming device session token, sliding its idle expiry if valid.
     */
    @Transactional
    public Optional<FieldUser> validateDeviceSession(String rawSessionToken) {
        if (rawSessionToken == null || rawSessionToken.trim().isEmpty()) {
            return Optional.empty();
        }

        String hash = cryptoService.sha256Hex(rawSessionToken.trim());
        Instant now = Instant.now();
        Optional<DeviceSession> sessionOpt = deviceSessionRepository
                .findBySessionTokenHashAndRevokedAtIsNullAndIdleExpiresAtAfterAndAbsoluteExpiresAtAfter(hash, now, now);

        if (sessionOpt.isEmpty()) {
            return Optional.empty();
        }

        DeviceSession session = sessionOpt.get();
        // Slide idle expiry by 30 days
        session.setIdleExpiresAt(now.plus(DEVICE_SESSION_IDLE_DAYS, ChronoUnit.DAYS));
        session.setLastUsedAt(now);
        deviceSessionRepository.save(session);

        return fieldUserRepository.findById(session.getFieldUserId());
    }
}
