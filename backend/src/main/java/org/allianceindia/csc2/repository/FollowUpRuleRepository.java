package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.FollowUpRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FollowUpRuleRepository extends JpaRepository<FollowUpRule, UUID> {
    Optional<FollowUpRule> findByCode(String code);

    List<FollowUpRule> findByStatusOrderByCreatedAtDesc(String status);

    @Query("SELECT r FROM FollowUpRule r WHERE r.status = 'ACTIVE' AND (r.effectiveFrom IS NULL OR r.effectiveFrom <= :asOf) AND (r.effectiveTo IS NULL OR r.effectiveTo >= :asOf) ORDER BY r.category, r.code")
    List<FollowUpRule> findActiveRulesInForce(@Param("asOf") Instant asOf);

    @Query("SELECT r FROM FollowUpRule r WHERE (:status IS NULL OR r.status = :status) AND (:category IS NULL OR r.category = :category) AND (:scope IS NULL OR r.scope = :scope) ORDER BY r.createdAt DESC")
    List<FollowUpRule> findWithFilters(@Param("status") String status, @Param("category") String category, @Param("scope") String scope);
}
