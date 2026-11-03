package org.allianceindia.csc2.service.sms;

import org.allianceindia.csc2.domain.SmsOutbox;
import org.allianceindia.csc2.repository.SmsOutboxRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Random;

@Service
public class SmsOutboxService {

    private static final Logger log = LoggerFactory.getLogger(SmsOutboxService.class);

    private final SmsOutboxRepository outboxRepository;
    private final Map<String, SmsProvider> providerMap;
    private final String configuredProvider;
    private final Random random = new Random();

    public SmsOutboxService(
            SmsOutboxRepository outboxRepository,
            Map<String, SmsProvider> providerMap,
            @Value("${app.sms.provider:mock}") String configuredProvider) {
        this.outboxRepository = outboxRepository;
        this.providerMap = providerMap;
        this.configuredProvider = configuredProvider.trim().toLowerCase();
    }

    private SmsProvider getActiveProvider() {
        if ("textbee".equalsIgnoreCase(configuredProvider)) {
            return providerMap.getOrDefault("textBeeSmsAdapter", providerMap.get("mockSmsAdapter"));
        } else if ("licensed".equalsIgnoreCase(configuredProvider)) {
            return providerMap.getOrDefault("licensedProviderStubAdapter", providerMap.get("mockSmsAdapter"));
        }
        return providerMap.getOrDefault("mockSmsAdapter", providerMap.values().iterator().next());
    }

    /**
     * Enqueues an SMS in the outbox table within the caller's transaction.
     */
    @Transactional
    public SmsOutbox enqueue(String phoneE164, String messageText) {
        SmsOutbox record = new SmsOutbox(phoneE164, messageText);
        return outboxRepository.save(record);
    }

    /**
     * Attempts immediate delivery of an outbox message, falling back to scheduled retry if it fails.
     */
    @Transactional
    public boolean deliverNow(SmsOutbox record) {
        SmsProvider provider = getActiveProvider();
        record.setAttempts(record.getAttempts() + 1);
        record.setLastAttemptAt(Instant.now());

        SmsDeliveryResult result = provider.sendSms(record.getPhoneE164(), record.getMessageText());
        if (result.success()) {
            record.setStatus("DELIVERED");
            record.setGatewayMessageId(result.messageId());
            record.setErrorMessage(null);
            record.setLastErrorCode(null);
            outboxRepository.save(record);
            return true;
        } else {
            record.setLastErrorCode(result.errorCode());
            record.setErrorMessage(result.errorMessage());
            if (record.getAttempts() >= record.getMaxRetries()) {
                record.setStatus("DEAD");
                log.error("SMS outbox entry {} marked DEAD after {} attempts to {}",
                        record.getId(), record.getAttempts(), record.getPhoneE164());
            } else {
                record.setStatus("FAILED");
            }
            outboxRepository.save(record);
            return false;
        }
    }

    /**
     * Background retry worker running every 15 seconds.
     * Retries failed or pending messages with jitter to avoid stampedes.
     */
    @Scheduled(fixedDelay = 15000, initialDelay = 5000)
    @Transactional
    public void processPendingOutbox() {
        List<SmsOutbox> pending = outboxRepository.findByStatusInOrderByCreatedAtAsc(
                List.of("PENDING", "FAILED"), PageRequest.of(0, 20)
        );

        if (pending.isEmpty()) return;

        log.debug("Processing {} pending SMS outbox messages", pending.size());
        for (SmsOutbox msg : pending) {
            // Check retry cooldown if previously failed (e.g., attempt 1 = 10s, attempt 2 = 30s)
            if ("FAILED".equals(msg.getStatus()) && msg.getLastAttemptAt() != null) {
                long elapsedSeconds = Instant.now().getEpochSecond() - msg.getLastAttemptAt().getEpochSecond();
                int backoffSeconds = (int) Math.pow(3, msg.getAttempts()) + random.nextInt(5);
                if (elapsedSeconds < backoffSeconds) {
                    continue; // Skip until backoff expires
                }
            }
            deliverNow(msg);
        }
    }
}
