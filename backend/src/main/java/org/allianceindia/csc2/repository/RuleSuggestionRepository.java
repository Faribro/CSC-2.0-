package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.RuleSuggestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RuleSuggestionRepository extends JpaRepository<RuleSuggestion, UUID> {
    List<RuleSuggestion> findByClientIdOrderBySuggestedDateAsc(UUID clientId);

    List<RuleSuggestion> findByClientIdAndOutcomeOrderBySuggestedDateAsc(UUID clientId, String outcome);

    Optional<RuleSuggestion> findByClientIdAndRuleIdAndRuleVersionAndSuggestedDate(UUID clientId, UUID ruleId, int ruleVersion, LocalDate suggestedDate);

    @Query("SELECT s FROM RuleSuggestion s WHERE s.client.id = :clientId AND s.outcome = 'PENDING' ORDER BY s.suggestedDate ASC")
    List<RuleSuggestion> findPendingByClientId(@Param("clientId") UUID clientId);

    @Query("SELECT s FROM RuleSuggestion s JOIN FETCH s.client JOIN FETCH s.rule WHERE s.outcome = 'PENDING' AND s.suggestedDate <= :asOfDate ORDER BY s.suggestedDate ASC")
    List<RuleSuggestion> findDueSuggestions(@Param("asOfDate") LocalDate asOfDate);
}
