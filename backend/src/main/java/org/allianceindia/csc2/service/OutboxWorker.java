package org.allianceindia.csc2.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.allianceindia.csc2.domain.OutboxEvent;
import org.allianceindia.csc2.repository.OutboxRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class OutboxWorker {

    private static final Logger log = LoggerFactory.getLogger(OutboxWorker.class);

    private final OutboxRepository outboxRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String gatewayUrl;
    private final String gatewaySecret;

    public OutboxWorker(OutboxRepository outboxRepository,
                        ObjectMapper objectMapper,
                        @Value("${app.apps-script.gateway-url:http://localhost:8080/api/mock/apps-script-gateway}") String gatewayUrl,
                        @Value("${app.apps-script.gateway-secret:local_gateway_synthetic_secret_token_12345}") String gatewaySecret) {
        this.outboxRepository = outboxRepository;
        this.objectMapper = objectMapper;
        this.restTemplate = new RestTemplate();
        this.gatewayUrl = gatewayUrl;
        this.gatewaySecret = gatewaySecret;
    }

    /**
     * Event-triggered push worker with 500ms short coalescing window.
     * Prevents multi-second polling lag while batching concurrent transactional commits.
     */
    @Scheduled(fixedDelay = 500)
    @Transactional
    public void processPendingOutbox() {
        List<OutboxEvent> events = outboxRepository.findPendingEventsForProcessing(20);
        if (events.isEmpty()) {
            return;
        }

        for (OutboxEvent event : events) {
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                long timestamp = Instant.now().toEpochMilli();
                String nonce = UUID.randomUUID().toString();
                String payloadString = event.getPayload();
                String eventIdStr = event.getId().toString();

                // Compute HMAC-SHA256 signature for body-authenticated Apps Script ingestion
                String messageToSign = timestamp + ":" + nonce + ":" + eventIdStr + ":" + payloadString;
                String signature = computeHmacSha256(messageToSign, gatewaySecret);

                Map<String, Object> body = new HashMap<>();
                body.put("secret", gatewaySecret);
                body.put("eventId", eventIdStr);
                body.put("eventType", event.getEventType());
                body.put("aggregateType", event.getAggregateType());
                body.put("aggregateId", event.getAggregateId() != null ? event.getAggregateId().toString() : null);
                body.put("timestamp", timestamp);
                body.put("nonce", nonce);
                body.put("signature", signature);
                body.put("payload", payloadString);

                String jsonBody = objectMapper.writeValueAsString(body);
                HttpEntity<String> request = new HttpEntity<>(jsonBody, headers);

                // Dispatch event to Apps Script gateway mirror
                restTemplate.postForLocation(gatewayUrl, request);

                event.setStatus("PUBLISHED");
                event.setLastAttemptAt(Instant.now());
                outboxRepository.save(event);
            } catch (Exception ex) {
                log.warn("Outbox dispatch failed for event {}: {}", event.getId(), ex.getMessage());
                event.setAttempts(event.getAttempts() + 1);
                event.setLastAttemptAt(Instant.now());
                event.setErrorMessage(ex.getMessage());
                if (event.getAttempts() >= 5) {
                    event.setStatus("FAILED");
                }
                outboxRepository.save(event);
            }
        }
    }

    private String computeHmacSha256(String data, String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] hmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hmac);
        } catch (Exception e) {
            throw new RuntimeException("HMAC computation failed", e);
        }
    }
}
