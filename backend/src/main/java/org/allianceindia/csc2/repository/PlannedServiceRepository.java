package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.PlannedService;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PlannedServiceRepository extends JpaRepository<PlannedService, UUID> {
    List<PlannedService> findByClientIdOrderByTargetDueDateAsc(UUID clientId);
    Optional<PlannedService> findByIdAndClientId(UUID id, UUID clientId);
}
