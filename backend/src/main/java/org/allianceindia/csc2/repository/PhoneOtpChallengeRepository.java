package org.allianceindia.csc2.repository;

import jakarta.persistence.LockModeType;
import org.allianceindia.csc2.domain.PhoneOtpChallenge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PhoneOtpChallengeRepository extends JpaRepository<PhoneOtpChallenge, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PhoneOtpChallenge> findTopByPhoneE164AndConsumedAtIsNullAndExpiresAtAfterOrderByCreatedAtDesc(
            String phoneE164, Instant now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE PhoneOtpChallenge c SET c.consumedAt = :now WHERE c.id = :id AND c.consumedAt IS NULL")
    int consumeChallengeAtomically(@Param("id") UUID id, @Param("now") Instant now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE PhoneOtpChallenge c SET c.consumedAt = :now WHERE c.phoneE164 = :phone AND c.consumedAt IS NULL")
    int invalidatePendingChallenges(@Param("phone") String phone, @Param("now") Instant now);

    List<PhoneOtpChallenge> findByPhoneE164AndCreatedAtAfter(String phoneE164, Instant after);
    long countByPhoneE164AndCreatedAtAfter(String phoneE164, Instant after);
    long countByIpAddressAndCreatedAtAfter(String ipAddress, Instant after);
}
