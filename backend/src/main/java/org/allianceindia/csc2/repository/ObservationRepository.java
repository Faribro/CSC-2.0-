package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.Observation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ObservationRepository extends JpaRepository<Observation, UUID> {
    List<Observation> findByClientIdOrderByObservationDateDesc(UUID clientId);
}
