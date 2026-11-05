package org.allianceindia.csc2.service;

import org.springframework.stereotype.Service;

import java.util.Set;

/**
 * NIST SP 800-63B Aligned Password Validator.
 * Enforces length-based policy (minimum 12 characters, no arbitrary composition rules)
 * and verifies passwords against common dictionary and breached password lists.
 */
@Service
public class PasswordValidatorService {

    public static final int MIN_PASSWORD_LENGTH = 12;

    // Top breached and common dictionary passwords (case-insensitive checks)
    private static final Set<String> COMMON_PASSWORDS = Set.of(
            "password1234",
            "password12345",
            "password123456",
            "qwerty123456",
            "123456789012",
            "admin12345678",
            "welcome123456",
            "india12345678",
            "alliance123456",
            "naco123456789",
            "letmein123456",
            "changeme12345",
            "changeme123456",
            "iloveyou12345",
            "sunshine12345",
            "princess12345",
            "football12345",
            "monkey1234567"
    );

    public record ValidationResult(boolean valid, String errorMessage) {}

    public ValidationResult validate(String password, String confirmPassword) {
        if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
            return new ValidationResult(false, "Password must be at least " + MIN_PASSWORD_LENGTH + " characters long (NIST SP 800-63B).");
        }

        if (confirmPassword != null && !password.equals(confirmPassword)) {
            return new ValidationResult(false, "Password and confirmation password do not match.");
        }

        String lower = password.trim().toLowerCase();
        if (COMMON_PASSWORDS.contains(lower)) {
            return new ValidationResult(false, "Password is too common or appears in compromised password lists. Please choose a more unique passphrase.");
        }

        // Check for trivial repeated character patterns (e.g. "aaaaaaaaaaaa")
        if (lower.chars().distinct().count() <= 2) {
            return new ValidationResult(false, "Password has too few unique characters. Please choose a stronger passphrase.");
        }

        return new ValidationResult(true, null);
    }
}
