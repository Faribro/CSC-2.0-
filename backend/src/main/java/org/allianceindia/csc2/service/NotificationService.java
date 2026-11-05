package org.allianceindia.csc2.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.allianceindia.csc2.domain.NotificationOutbox;
import org.allianceindia.csc2.repository.NotificationOutboxRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationOutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;
    private final String providerMode; // 'apps_script', 'smtp', 'resend', 'mock'
    private final String appsScriptUrl;
    private final String appsScriptCredential;
    private final String resendApiKey;
    private final String appBaseUrl;
    private final HttpClient httpClient;
    private final org.springframework.core.env.Environment environment;

    public NotificationService(
            NotificationOutboxRepository outboxRepository,
            ObjectMapper objectMapper,
            org.springframework.core.env.Environment environment,
            @Value("${app.notification.provider:mock}") String providerMode,
            @Value("${app.notification.apps-script-url:}") String appsScriptUrl,
            @Value("${app.notification.apps-script-credential:}") String appsScriptCredential,
            @Value("${app.notification.resend-api-key:}") String resendApiKey,
            @Value("${app.base-url:http://localhost:3000}") String appBaseUrl) {
        this.outboxRepository = outboxRepository;
        this.objectMapper = objectMapper;
        this.environment = environment;
        this.providerMode = providerMode;
        this.appsScriptUrl = appsScriptUrl;
        this.appsScriptCredential = appsScriptCredential;
        this.resendApiKey = resendApiKey;
        this.appBaseUrl = appBaseUrl;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    @Transactional
    public NotificationOutbox enqueueEmail(String recipient, String template, Map<String, Object> payload) {
        try {
            String payloadJson = objectMapper.writeValueAsString(payload);
            NotificationOutbox item = new NotificationOutbox("EMAIL", recipient, template, payloadJson);
            return outboxRepository.save(item);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize notification payload", e);
        }
    }

    @Transactional
    public void processPendingNotifications() {
        List<NotificationOutbox> pending = outboxRepository.findByStatusOrderByCreatedAtAsc("PENDING");
        for (NotificationOutbox item : pending) {
            processItem(item);
        }
    }

    public void processItem(NotificationOutbox item) {
        item.setAttempts(item.getAttempts() + 1);
        item.setLastAttemptAt(Instant.now());

        try {
            Map<String, Object> data = objectMapper.readValue(item.getPayload(), Map.class);
            String subject = getSubjectForTemplate(item.getTemplate(), data);
            String bodyText = renderBodyForTemplate(item.getTemplate(), data);

            SendResult result = dispatchEmail(item.getRecipient(), subject, bodyText);
            if (result.success()) {
                item.setStatus(result.reportedDelivered() ? "DELIVERED" : "ACCEPTED");
                item.setErrorMessage(null);
                item.setLastErrorCode(null);
            } else {
                item.setLastErrorCode(result.errorCode());
                item.setErrorMessage(result.errorMessage());
                if (item.getAttempts() >= 5) {
                    item.setStatus("FAILED");
                }
            }
        } catch (Exception e) {
            log.error("Failed to process notification outbox item {}", item.getId(), e);
            item.setLastErrorCode("DISPATCH_EXCEPTION");
            item.setErrorMessage(e.getMessage());
            if (item.getAttempts() >= 5) {
                item.setStatus("FAILED");
            }
        }
        outboxRepository.save(item);
    }

    private SendResult dispatchEmail(String recipient, String subject, String bodyText) {
        if ("mock".equalsIgnoreCase(providerMode)) {
            String[] activeProfiles = environment.getActiveProfiles();
            if (java.util.Arrays.asList(activeProfiles).contains("prod") || java.util.Arrays.asList(activeProfiles).contains("production") || java.util.Arrays.asList(activeProfiles).contains("staging")) {
                log.error("SECURITY ALERT: Mock notification provider attempted in non-local profile! Failing closed.");
                return new SendResult(false, false, "MOCK_DISABLED_IN_PROD", "Mock email provider is strictly forbidden in production profile.");
            }
            // Local synthetic development mode only
            log.info("[MOCK_EMAIL] To: {} | Subject: {} | Body length: {}", recipient, subject, bodyText.length());
            return new SendResult(true, true, null, null);
        }

        if ("apps_script".equalsIgnoreCase(providerMode)) {
            return sendViaAppsScript(recipient, subject, bodyText);
        }

        if ("resend".equalsIgnoreCase(providerMode)) {
            return sendViaResend(recipient, subject, bodyText);
        }

        return new SendResult(false, false, "PROVIDER_UNCONFIGURED", "No valid notification provider configured");
    }

    private SendResult sendViaAppsScript(String recipient, String subject, String bodyText) {
        try {
            if (appsScriptUrl == null || appsScriptUrl.trim().isEmpty()) {
                return new SendResult(false, false, "MISSING_URL", "Apps Script endpoint URL unconfigured");
            }

            Map<String, String> reqBody = Map.of(
                    "service_credential", appsScriptCredential != null ? appsScriptCredential : "",
                    "recipient", recipient,
                    "subject", subject,
                    "body", bodyText
            );
            String json = objectMapper.writeValueAsString(reqBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(appsScriptUrl))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .timeout(Duration.ofSeconds(15))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                boolean delivered = response.body().contains("\"delivered\":true") || response.body().contains("\"status\":\"DELIVERED\"");
                return new SendResult(true, delivered, null, null);
            } else {
                return new SendResult(false, false, "HTTP_" + response.statusCode(), "Apps Script gateway failed with status " + response.statusCode());
            }
        } catch (Exception e) {
            return new SendResult(false, false, "GATEWAY_ERROR", e.getMessage());
        }
    }

    private SendResult sendViaResend(String recipient, String subject, String bodyText) {
        try {
            if (resendApiKey == null || resendApiKey.trim().isEmpty()) {
                return new SendResult(false, false, "MISSING_KEY", "Resend API key unconfigured");
            }

            Map<String, Object> reqBody = Map.of(
                    "from", "CSC Platform <notifications@allianceindia.org>",
                    "to", List.of(recipient),
                    "subject", subject,
                    "text", bodyText
            );
            String json = objectMapper.writeValueAsString(reqBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.resend.com/emails"))
                    .header("Authorization", "Bearer " + resendApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .timeout(Duration.ofSeconds(15))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return new SendResult(true, false, null, null); // Resend reports ACCEPTED immediately
            } else {
                return new SendResult(false, false, "RESEND_" + response.statusCode(), response.body());
            }
        } catch (Exception e) {
            return new SendResult(false, false, "RESEND_EXCEPTION", e.getMessage());
        }
    }

    private String getSubjectForTemplate(String template, Map<String, Object> data) {
        return switch (template) {
            case "LEADERSHIP_OTP" -> "CSC 2.0 National Leadership Access Code";
            case "STATE_MANAGER_SIGNUP" -> "CSC 2.0 State Verification & Invitation Credentials";
            case "ADMIN_APPROVAL_REQUEST" -> "Action Required: New State Manager Registration Pending Review";
            case "APPLICANT_APPROVED" -> "CSC 2.0 Registration Approved - Access Activated";
            case "APPLICANT_REJECTED" -> "CSC 2.0 Registration Status Update";
            case "STATE_CODE_RESEND" -> "CSC 2.0 State Invitation Code Dispatch";
            default -> "CSC 2.0 System Notification";
        };
    }

    private String renderBodyForTemplate(String template, Map<String, Object> data) {
        StringBuilder sb = new StringBuilder();
        switch (template) {
            case "LEADERSHIP_OTP" -> {
                String name = String.valueOf(data.getOrDefault("name", "Leadership Member"));
                String otp = String.valueOf(data.getOrDefault("otp", ""));
                sb.append("CSC 2.0 National Strategic Surveillance Access\n\n");
                sb.append("Dear ").append(name).append(",\n\n");
                sb.append("Your one-time strategic surveillance access code is: ").append(otp).append("\n\n");
                sb.append("Validity: 10 minutes (Locked after 5 failed attempts).\n");
                sb.append("Security Notice: This code is strictly personal. Do not forward or share.\n\n");
                sb.append("Regards,\nCSC 2.0 National Security Authority\n");
            }
            case "STATE_MANAGER_SIGNUP" -> {
                String name = String.valueOf(data.getOrDefault("firstName", "State Manager"));
                String state = String.valueOf(data.getOrDefault("state", "State"));
                String otp = String.valueOf(data.getOrDefault("otp", ""));
                String code = String.valueOf(data.getOrDefault("stateCode", ""));

                sb.append("CSC 2.0 Care & Support Centre Platform\n\n");
                sb.append("Dear ").append(name).append(",\n\n");
                sb.append("Thank you for registering as State Manager for ").append(state).append(".\n\n");
                sb.append("--------------------------------------------------\n");
                sb.append("1. PERSONAL EMAIL VERIFICATION CODE\n");
                sb.append("Code: ").append(otp).append("\n");
                sb.append("Validity: 10 minutes (Expires after 5 attempts)\n");
                sb.append("Note: This code proves your email ownership.\n");
                sb.append("--------------------------------------------------\n\n");
                if (!code.isEmpty()) {
                    sb.append("--------------------------------------------------\n");
                    sb.append("2. STATE INVITATION CODE FOR FIELD CASEWORKERS\n");
                    sb.append("State Code: ").append(code).append("\n");
                    sb.append("Usage: Share this code exclusively with verified field caseworkers in ").append(state).append(".\n");
                    sb.append("Quota: Up to 50 caseworker activations.\n");
                    sb.append("--------------------------------------------------\n\n");
                }
                sb.append("Hindi Summary / हिन्दी सारांश:\n");
                sb.append("आपका ईमेल सत्यापन कोड ").append(otp).append(" है। यह 10 मिनट के लिए मान्य है।\n");
                if (!code.isEmpty()) {
                    sb.append("आपके राज्य के फील्ड कार्यकर्ताओं के लिए आमंत्रण कोड ").append(code).append(" है।\n");
                }
                sb.append("\nRegards,\nCSC 2.0 National Administrative Authority\n");
            }
            case "ADMIN_APPROVAL_REQUEST" -> {
                String applicantName = String.valueOf(data.getOrDefault("applicantName", ""));
                String applicantEmail = String.valueOf(data.getOrDefault("applicantEmail", ""));
                String state = String.valueOf(data.getOrDefault("state", ""));
                String org = String.valueOf(data.getOrDefault("organization", ""));
                String regId = String.valueOf(data.getOrDefault("registrationId", ""));

                sb.append("CSC 2.0 Administrator Review Dispatch\n\n");
                sb.append("A new State Manager registration requires administrative verification.\n\n");
                sb.append("Applicant: ").append(applicantName).append(" (").append(applicantEmail).append(")\n");
                sb.append("State: ").append(state).append("\n");
                sb.append("Organization: ").append(org).append("\n\n");
                sb.append("Direct Review Link (Admin login required):\n");
                sb.append(appBaseUrl).append("/admin/registrations?id=").append(regId).append("\n\n");
                sb.append("Security Notice: Administrative actions require full authenticated POST via the dashboard.\n");
            }
            case "APPLICANT_APPROVED" -> {
                String name = String.valueOf(data.getOrDefault("firstName", "State Manager"));
                String state = String.valueOf(data.getOrDefault("state", ""));

                sb.append("CSC 2.0 Registration Approved\n\n");
                sb.append("Dear ").append(name).append(",\n\n");
                sb.append("Your registration as State Manager for ").append(state).append(" has been approved by the National Administrator.\n");
                sb.append("You may now sign in at: ").append(appBaseUrl).append("/sign-in\n\n");
                sb.append("Regards,\nCSC 2.0 Operations Team\n");
            }
            case "APPLICANT_REJECTED" -> {
                String name = String.valueOf(data.getOrDefault("firstName", "Applicant"));
                String reason = String.valueOf(data.getOrDefault("reason", "Administrative policy requirements not met"));

                sb.append("CSC 2.0 Registration Update\n\n");
                sb.append("Dear ").append(name).append(",\n\n");
                sb.append("Your registration application could not be approved at this time.\n");
                sb.append("Reason: ").append(reason).append("\n\n");
                sb.append("If you believe this is in error, please contact your national programme coordinator.\n");
            }
            case "STATE_CODE_RESEND" -> {
                String name = String.valueOf(data.getOrDefault("firstName", "State Manager"));
                String state = String.valueOf(data.getOrDefault("state", ""));
                String code = String.valueOf(data.getOrDefault("stateCode", ""));

                sb.append("CSC 2.0 State Invitation Code Dispatch\n\n");
                sb.append("Dear ").append(name).append(",\n\n");
                sb.append("As requested, here is the active invitation code for ").append(state).append(":\n\n");
                sb.append("Code: ").append(code).append("\n\n");
                sb.append("Share this code only with authorized field caseworkers.\n");
            }
            default -> sb.append("CSC 2.0 Notification: ").append(data);
        }
        return sb.toString();
    }

    public record SendResult(boolean success, boolean reportedDelivered, String errorCode, String errorMessage) {}
}
