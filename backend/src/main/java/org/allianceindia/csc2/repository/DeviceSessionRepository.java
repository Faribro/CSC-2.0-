package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.DeviceSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DeviceSessionRepository extends JpaRepository<DeviceSession, UUID> {
    Optional<DeviceSession> findBySessionTokenHashAndRevokedAtIsNullAndIdleExpiresAtAfterAndAbsoluteExpiresAtAfter(
            String sessionTokenHash, Instant now1, Instant now2);

    Optional<DeviceSession> findByRefreshTokenHashAndRevokedAtIsNullAndAbsoluteExpiresAtAfter(
            String refreshTokenHash, Instant now);

    List<DeviceSession> findByFieldUserIdAndRevokedAtIsNull(UUID fieldUserId);
    Optional<DeviceSession> findByFieldUserIdAndDeviceIdAndRevokedAtIsNull(UUID fieldUserId, String deviceId);
}
