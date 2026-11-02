package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.Encounter;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface EncounterRepository extends JpaRepository<Encounter, UUID> {
    List<Encounter> findByClientIdOrderByObservationDateDescRecordedAtDesc(UUID clientId);
}
