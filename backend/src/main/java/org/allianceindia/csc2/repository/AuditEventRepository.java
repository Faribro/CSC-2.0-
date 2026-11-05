package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.AuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {
    List<AuditEvent> findByResourceIdOrderByOccurredAtDesc(UUID resourceId);
    List<AuditEvent> findByResourceIdAndAction(UUID resourceId, String action);
    List<AuditEvent> findByActorIdOrderByOccurredAtDesc(UUID actorId);
}
