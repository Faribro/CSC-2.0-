package org.allianceindia.csc2.service.sms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component("mockSmsAdapter")
public class MockSmsAdapter implements SmsProvider {

    private static final Logger log = LoggerFactory.getLogger(MockSmsAdapter.class);

    private final Environment environment;
    private final Map<String, String> lastSentSms = new ConcurrentHashMap<>();

    public MockSmsAdapter(Environment environment) {
        this.environment = environment;
    }

    @Override
    public SmsDeliveryResult sendSms(String recipientPhoneE164, String messageText) {
        // Fail-closed security check: NEVER allow mock SMS in production
        String[] activeProfiles = environment.getActiveProfiles();
        if (Arrays.asList(activeProfiles).contains("prod") || Arrays.asList(activeProfiles).contains("production")) {
            log.error("SECURITY ALERT: MockSmsAdapter invocation attempted in production profile! Failing closed.");
            return SmsDeliveryResult.error("MOCK_DISABLED_IN_PROD", "Mock SMS adapter cannot be used in production environment.");
        }

        String messageId = "mock-sms-" + UUID.randomUUID();
        lastSentSms.put(recipientPhoneE164, messageText);
        log.info("[MOCK SMS GATEWAY] Dispatching to {} (msgId={}): {}", recipientPhoneE164, messageId, messageText);
        return SmsDeliveryResult.ok(messageId);
    }

    @Override
    public String getProviderName() {
        return "mock";
    }

    public String getLastSentMessage(String phoneE164) {
        return lastSentSms.get(phoneE164);
    }

    public void clear() {
        lastSentSms.clear();
    }
}
