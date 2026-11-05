package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.ContactAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ContactAttemptRepository extends JpaRepository<ContactAttempt, UUID> {
    List<ContactAttempt> findByClientIdOrderByAttemptDateDesc(UUID clientId);
    List<ContactAttempt> findByClientIdOrderByAttemptDateDescAttemptTimeDesc(UUID clientId);
    List<ContactAttempt> findByTaskIdOrderByAttemptDateDesc(UUID taskId);
}
