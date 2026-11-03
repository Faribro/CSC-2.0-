package org.allianceindia.csc2.service.sms;

public interface SmsProvider {
    /**
     * Sends an SMS message to an E.164 formatted phone number.
     *
     * @param recipientPhoneE164 Target phone number in E.164 format (+91XXXXXXXXXX)
     * @param messageText SMS body text
     * @return SmsDeliveryResult indicating gateway dispatch status
     */
    SmsDeliveryResult sendSms(String recipientPhoneE164, String messageText);

    /**
     * Returns the provider identifier (e.g. "mock", "textbee", "licensed")
     */
    String getProviderName();
}
