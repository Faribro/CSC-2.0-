package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.ClientApplicationAddition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ClientApplicationAdditionRepository extends JpaRepository<ClientApplicationAddition, UUID> {
    Optional<ClientApplicationAddition> findByClientId(UUID clientId);
}
