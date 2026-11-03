package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.PhoneOtpChallenge;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PhoneOtpChallengeRepository extends JpaRepository<PhoneOtpChallenge, UUID> {
    Optional<PhoneOtpChallenge> findTopByPhoneE164AndConsumedAtIsNullAndExpiresAtAfterOrderByCreatedAtDesc(
            String phoneE164, Instant now);

    List<PhoneOtpChallenge> findByPhoneE164AndCreatedAtAfter(String phoneE164, Instant after);
    long countByPhoneE164AndCreatedAtAfter(String phoneE164, Instant after);
    long countByIpAddressAndCreatedAtAfter(String ipAddress, Instant after);
}
