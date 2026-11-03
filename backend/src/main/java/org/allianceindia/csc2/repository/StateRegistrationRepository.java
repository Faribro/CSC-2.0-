package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.StateRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StateRegistrationRepository extends JpaRepository<StateRegistration, UUID> {
    Optional<StateRegistration> findByWorkEmailIgnoreCase(String workEmail);
    List<StateRegistration> findByStatusOrderByCreatedAtDesc(String status);
    List<StateRegistration> findByRequestedStateIgnoreCase(String state);
}
