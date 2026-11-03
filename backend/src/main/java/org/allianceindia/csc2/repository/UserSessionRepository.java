package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, UUID> {
    Optional<UserSession> findBySessionTokenHashAndRevokedAtIsNull(String sessionTokenHash);
    Optional<UserSession> findByRefreshTokenHash(String refreshTokenHash);
    List<UserSession> findByUserIdAndRevokedAtIsNull(UUID userId);
}
