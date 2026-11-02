package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.Client;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

public interface ClientRepository extends JpaRepository<Client, UUID> {
    Optional<Client> findByIdAndCenterIdIn(UUID id, Collection<String> centerIds);
    Optional<Client> findByClientRef(String clientRef);
    Page<Client> findByCenterIdIn(Collection<String> centerIds, Pageable pageable);
    long countByCenterIdIn(Collection<String> centerIds);
}
