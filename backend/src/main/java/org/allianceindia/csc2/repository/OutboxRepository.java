package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface OutboxRepository extends JpaRepository<OutboxEvent, UUID> {
    
    @Query(value = "SELECT * FROM csc2.outbox WHERE status = 'PENDING' ORDER BY created_at ASC LIMIT :limit FOR UPDATE SKIP LOCKED", nativeQuery = true)
    List<OutboxEvent> findPendingEventsForProcessing(@Param("limit") int limit);

    List<OutboxEvent> findByAggregateIdOrderByCreatedAtDesc(UUID aggregateId);
}
