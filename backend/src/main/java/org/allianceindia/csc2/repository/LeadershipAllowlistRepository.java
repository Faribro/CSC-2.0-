package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.LeadershipAllowlist;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface LeadershipAllowlistRepository extends JpaRepository<LeadershipAllowlist, UUID> {
    Optional<LeadershipAllowlist> findByEmailIgnoreCaseAndActiveTrue(String email);
    boolean existsByEmailIgnoreCaseAndActiveTrue(String email);
}
