package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.FollowUpRuleHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FollowUpRuleHistoryRepository extends JpaRepository<FollowUpRuleHistory, UUID> {
    List<FollowUpRuleHistory> findByRuleIdOrderByVersionDesc(UUID ruleId);
    List<FollowUpRuleHistory> findByRuleIdOrderByCreatedAtDesc(UUID ruleId);
}
