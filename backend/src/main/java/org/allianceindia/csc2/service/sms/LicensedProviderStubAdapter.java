package org.allianceindia.csc2.service.sms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Stub adapter for licensed Indian telecom aggregator conforming to
 * TRAI TCCCPR 2018 DLT regulations (e.g. Karix, Gupshup, ValueFirst, Airtel IQ).
 */
@Component("licensedProviderStubAdapter")
public class LicensedProviderStubAdapter implements SmsProvider {

    private static final Logger log = LoggerFactory.getLogger(LicensedProviderStubAdapter.class);

    @Override
    public SmsDeliveryResult sendSms(String recipientPhoneE164, String messageText) {
        log.info("[DLT LICENSED PROVIDER STUB] Prepared message for {} with DLT PE ID and Template ID. Message: {}",
                recipientPhoneE164, messageText);
        return SmsDeliveryResult.ok("dlt-aggregator-" + System.currentTimeMillis());
    }

    @Override
    public String getProviderName() {
        return "licensed";
    }
}
