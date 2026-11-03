package org.allianceindia.csc2.service.sms;

public record SmsDeliveryResult(
        boolean success,
        String messageId,
        String errorCode,
        String errorMessage
) {
    public static SmsDeliveryResult ok(String messageId) {
        return new SmsDeliveryResult(true, messageId, null, null);
    }

    public static SmsDeliveryResult error(String errorCode, String errorMessage) {
        return new SmsDeliveryResult(false, null, errorCode, errorMessage);
    }
}
