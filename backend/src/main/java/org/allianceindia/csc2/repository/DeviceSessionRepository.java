package org.allianceindia.csc2.repository;

import jakarta.persistence.LockModeType;
import org.allianceindia.csc2.domain.DeviceSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DeviceSessionRepository extends JpaRepository<DeviceSession, UUID> {
    Optional<DeviceSession> findBySessionTokenHashAndRevokedAtIsNullAndIdleExpiresAtAfterAndAbsoluteExpiresAtAfter(
            String sessionTokenHash, Instant now1, Instant now2);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<DeviceSession> findByRefreshTokenHashAndRevokedAtIsNullAndAbsoluteExpiresAtAfter(
            String refreshTokenHash, Instant now);

    @Modifying
    @Query("UPDATE DeviceSession s SET s.revokedAt = :now WHERE s.id = :id AND s.revokedAt IS NULL")
    int revokeSessionAtomically(@Param("id") UUID id, @Param("now") Instant now);

    List<DeviceSession> findByFieldUserIdAndRevokedAtIsNull(UUID fieldUserId);
    Optional<DeviceSession> findByFieldUserIdAndDeviceIdAndRevokedAtIsNull(UUID fieldUserId, String deviceId);
}
