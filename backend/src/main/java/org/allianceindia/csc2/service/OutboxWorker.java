package org.allianceindia.csc2.service;

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

import java.time.Instant;
import java.util.List;

@Component
public class OutboxWorker {

    private static final Logger log = LoggerFactory.getLogger(OutboxWorker.class);

    private final OutboxRepository outboxRepository;
    private final RestTemplate restTemplate;
    private final String gatewayUrl;
    private final String gatewaySecret;

    public OutboxWorker(OutboxRepository outboxRepository,
                        @Value("${app.apps-script.gateway-url:http://localhost:8080/api/mock/apps-script-gateway}") String gatewayUrl,
                        @Value("${app.apps-script.gateway-secret:local_gateway_synthetic_secret_token_12345}") String gatewaySecret) {
        this.outboxRepository = outboxRepository;
        this.restTemplate = new RestTemplate();
        this.gatewayUrl = gatewayUrl;
        this.gatewaySecret = gatewaySecret;
    }

    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void processPendingOutbox() {
        List<OutboxEvent> events = outboxRepository.findPendingEventsForProcessing(10);
        if (events.isEmpty()) {
            return;
        }

        for (OutboxEvent event : events) {
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.set("X-Gateway-Secret", gatewaySecret);

                HttpEntity<String> request = new HttpEntity<>(event.getPayload(), headers);
                // Dispatch event to gateway mirror
                restTemplate.postForLocation(gatewayUrl, request);

                event.setStatus("PUBLISHED");
                event.setLastAttemptAt(Instant.now());
                outboxRepository.save(event);
            } catch (Exception ex) {
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
}
