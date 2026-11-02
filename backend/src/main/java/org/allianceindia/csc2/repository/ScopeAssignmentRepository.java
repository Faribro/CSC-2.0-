package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.ScopeAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ScopeAssignmentRepository extends JpaRepository<ScopeAssignment, UUID> {
    List<ScopeAssignment> findByActorId(UUID actorId);
}
