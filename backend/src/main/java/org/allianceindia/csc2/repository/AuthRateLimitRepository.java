package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.AuthRateLimit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.UUID;

@Repository
public interface AuthRateLimitRepository extends JpaRepository<AuthRateLimit, UUID> {
    long countByRateKeyAndAttemptAtAfter(String rateKey, Instant after);
    void deleteByAttemptAtBefore(Instant before);
}
