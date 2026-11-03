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
    Page<Client> findByCenterIdInAndFullNameContainingIgnoreCase(Collection<String> centerIds, String fullName, Pageable pageable);
    Page<Client> findByFullNameContainingIgnoreCase(String fullName, Pageable pageable);
    long countByCenterIdIn(Collection<String> centerIds);

    // Field-user scoped queries (a field user sees ONLY records they submitted)
    Page<Client> findByFieldUserId(UUID fieldUserId, Pageable pageable);
    Page<Client> findByFieldUserIdAndFullNameContainingIgnoreCase(UUID fieldUserId, String fullName, Pageable pageable);
    Optional<Client> findByIdAndFieldUserId(UUID id, UUID fieldUserId);
    long countByFieldUserId(UUID fieldUserId);

    // State supervision queries
    Page<Client> findByState(String state, Pageable pageable);
    Page<Client> findByStateAndFullNameContainingIgnoreCase(String state, String fullName, Pageable pageable);
    long countByState(String state);
}
