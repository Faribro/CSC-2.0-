package org.allianceindia.csc2.service.sms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Component("textBeeSmsAdapter")
public class TextBeeSmsAdapter implements SmsProvider {

    private static final Logger log = LoggerFactory.getLogger(TextBeeSmsAdapter.class);

    private final String apiKey;
    private final String deviceId;
    private final String baseUrl;
    private final HttpClient httpClient;

    public TextBeeSmsAdapter(
            @Value("${app.sms.textbee.api-key:}") String apiKey,
            @Value("${app.sms.textbee.device-id:}") String deviceId,
            @Value("${app.sms.textbee.base-url:https://api.textbee.dev/api/v1/gateway}") String baseUrl) {
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.deviceId = deviceId != null ? deviceId.trim() : "";
        this.baseUrl = baseUrl != null ? baseUrl.trim() : "https://api.textbee.dev/api/v1/gateway";
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    @Override
    public SmsDeliveryResult sendSms(String recipientPhoneE164, String messageText) {
        if (apiKey.isEmpty() || deviceId.isEmpty()) {
            log.warn("TextBee adapter called but TEXTBEE_API_KEY or TEXTBEE_DEVICE_ID is unconfigured.");
            return SmsDeliveryResult.error("CONFIG_MISSING", "TextBee API key or device ID not configured");
        }

        try {
            // Escape json strings
            String escapedMessage = messageText.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
            String requestJson = String.format(
                    "{\"recipients\":[\"%s\"],\"message\":\"%s\",\"deviceId\":\"%s\"}",
                    recipientPhoneE164, escapedMessage, deviceId
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/send-sms"))
                    .timeout(Duration.ofSeconds(15))
                    .header("Content-Type", "application/json")
                    .header("x-api-key", apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            int statusCode = response.statusCode();

            if (statusCode >= 200 && statusCode < 300) {
                log.info("TextBee SMS dispatch succeeded for recipient={}: status={}", recipientPhoneE164, statusCode);
                return SmsDeliveryResult.ok("textbee-" + System.currentTimeMillis());
            } else {
                log.error("TextBee SMS dispatch returned non-2xx status: code={}, body={}", statusCode, response.body());
                return SmsDeliveryResult.error("HTTP_" + statusCode, "Gateway error: " + response.body());
            }
        } catch (Exception e) {
            log.error("TextBee gateway exception during dispatch to {}: {}", recipientPhoneE164, e.getMessage());
            return SmsDeliveryResult.error("NETWORK_FAILURE", e.getMessage());
        }
    }

    @Override
    public String getProviderName() {
        return "textbee";
    }
}
