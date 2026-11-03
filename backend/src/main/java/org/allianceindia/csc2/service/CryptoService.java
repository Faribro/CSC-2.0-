package org.allianceindia.csc2.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class CryptoService {

    // Unambiguous Base32 charset (32 chars) excluding 0, O, 1, I
    public static final String SAFE_CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final int GCM_TAG_LENGTH = 128;
    private static final int GCM_IV_LENGTH = 12;

    private final String stateCodePepper;
    private final String envelopeSecret;
    private final SecureRandom secureRandom = new SecureRandom();

    public CryptoService(
            @Value("${app.security.state-code-pepper:local_dev_state_code_pepper_secret_key_32bytes_min}") String stateCodePepper,
            @Value("${app.security.envelope-secret:local_dev_envelope_secret_key_32bytes_min!}") String envelopeSecret) {
        if (stateCodePepper == null || stateCodePepper.trim().length() < 16) {
            throw new IllegalStateException("REQUIRED secret app.security.state-code-pepper is missing or too short");
        }
        if (envelopeSecret == null || envelopeSecret.trim().length() < 16) {
            throw new IllegalStateException("REQUIRED secret app.security.envelope-secret is missing or too short");
        }
        this.stateCodePepper = stateCodePepper;
        this.envelopeSecret = envelopeSecret;
    }

    /**
     * Normalizes user-submitted or generated state code:
     * Strips all whitespace, dashes, and forces uppercase.
     */
    public String normalizeCode(String rawCode) {
        if (rawCode == null) return "";
        return rawCode.trim().toUpperCase().replaceAll("[\\s-]+", "");
    }

    /**
     * Generates a structured high-entropy state invitation code:
     * Format: ALN-<STATE>-<XXXX>-<XXXX> using SAFE_CHARSET
     */
    public String generateStateCode(String stateName) {
        String stateAbbr = getStateAbbr(stateName);
        StringBuilder sb = new StringBuilder("ALN-").append(stateAbbr).append("-");

        // Part 1: 4 chars
        for (int i = 0; i < 4; i++) {
            sb.append(SAFE_CHARSET.charAt(secureRandom.nextInt(SAFE_CHARSET.length())));
        }
        sb.append("-");
        // Part 2: 4 chars
        for (int i = 0; i < 4; i++) {
            sb.append(SAFE_CHARSET.charAt(secureRandom.nextInt(SAFE_CHARSET.length())));
        }
        return sb.toString();
    }

    /**
     * Computes HMAC-SHA256 verifier of normalized state code using server pepper.
     */
    public String computeStateCodeVerifier(String plainCode) {
        String normalized = normalizeCode(plainCode);
        return hmacSha256(normalized, stateCodePepper);
    }

    /**
     * Constant-time verification of a state code against stored HMAC verifier.
     */
    public boolean verifyStateCode(String plainCode, String storedVerifier) {
        if (plainCode == null || storedVerifier == null) return false;
        String computed = computeStateCodeVerifier(plainCode);
        return MessageDigest.isEqual(
                computed.getBytes(StandardCharsets.UTF_8),
                storedVerifier.getBytes(StandardCharsets.UTF_8)
        );
    }

    /**
     * Generates a 6-digit cryptographically secure numeric OTP string.
     */
    public String generate6DigitOtp() {
        int num = secureRandom.nextInt(900000) + 100000;
        return String.valueOf(num);
    }

    /**
     * Generates 16 random salt bytes as a hex string.
     */
    public String generateSaltHex() {
        byte[] salt = new byte[16];
        secureRandom.nextBytes(salt);
        return HexFormat.of().formatHex(salt);
    }

    /**
     * Computes SHA-256 hash of (saltHex + otp).
     */
    public String hashOtp(String otp, String saltHex) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(saltHex.getBytes(StandardCharsets.UTF_8));
            byte[] digest = md.digest(otp.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 digest failure", e);
        }
    }

    /**
     * Constant-time check of submitted OTP against stored hash and salt.
     */
    public boolean verifyOtp(String submittedOtp, String storedHash, String saltHex) {
        if (submittedOtp == null || storedHash == null || saltHex == null) return false;
        String computed = hashOtp(submittedOtp.trim(), saltHex);
        return MessageDigest.isEqual(
                computed.getBytes(StandardCharsets.UTF_8),
                storedHash.getBytes(StandardCharsets.UTF_8)
        );
    }

    /**
     * Encrypts a short-lived envelope payload using AES-256-GCM and envelopeSecret.
     */
    public String encryptEnvelope(String plaintext) {
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);

            byte[] keyBytes = sha256Bytes(envelopeSecret);
            SecretKeySpec keySpec = new SecretKeySpec(keyBytes, "AES");
            GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, gcmSpec);

            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] combined = new byte[iv.length + ciphertext.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(ciphertext, 0, combined, iv.length, ciphertext.length);

            return Base64.getUrlEncoder().withoutPadding().encodeToString(combined);
        } catch (Exception e) {
            throw new RuntimeException("Envelope encryption failure", e);
        }
    }

    /**
     * Decrypts an envelope payload using AES-256-GCM and envelopeSecret.
     */
    public String decryptEnvelope(String encodedEnvelope) {
        try {
            byte[] combined = Base64.getUrlDecoder().decode(encodedEnvelope);
            if (combined.length < GCM_IV_LENGTH + 16) {
                throw new IllegalArgumentException("Envelope payload too short");
            }
            byte[] iv = new byte[GCM_IV_LENGTH];
            System.arraycopy(combined, 0, iv, 0, GCM_IV_LENGTH);

            byte[] ciphertext = new byte[combined.length - GCM_IV_LENGTH];
            System.arraycopy(combined, GCM_IV_LENGTH, ciphertext, 0, ciphertext.length);

            byte[] keyBytes = sha256Bytes(envelopeSecret);
            SecretKeySpec keySpec = new SecretKeySpec(keyBytes, "AES");
            GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, keySpec, gcmSpec);

            byte[] plaintext = cipher.doFinal(ciphertext);
            return new String(plaintext, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Envelope decryption failure", e);
        }
    }

    /**
     * Computes SHA-256 of input string and returns hex string.
     */
    public String sha256Hex(String input) {
        return HexFormat.of().formatHex(sha256Bytes(input));
    }

    private byte[] sha256Bytes(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return md.digest(input.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private String hmacSha256(String data, String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] hmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hmac);
        } catch (Exception e) {
            throw new RuntimeException("HmacSHA256 computation failure", e);
        }
    }

    public static String getStateAbbr(String stateName) {
        if (stateName == null) return "XX";
        String s = stateName.trim().toUpperCase();
        return switch (s) {
            case "MAHARASHTRA" -> "MH";
            case "DELHI", "NCT OF DELHI" -> "DL";
            case "KARNATAKA" -> "KA";
            case "TAMIL NADU" -> "TN";
            case "GUJARAT" -> "GJ";
            case "TELANGANA" -> "TG";
            case "UTTAR PRADESH" -> "UP";
            case "WEST BENGAL" -> "WB";
            case "ANDHRA PRADESH" -> "AP";
            case "RAJASTHAN" -> "RJ";
            case "MADHYA PRADESH" -> "MP";
            case "BIHAR" -> "BR";
            case "PUNJAB" -> "PB";
            case "HARYANA" -> "HR";
            case "KERALA" -> "KL";
            case "ODISHA" -> "OD";
            default -> s.length() >= 2 ? s.substring(0, 2) : "IN";
        };
    }
}
