package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.SmsOutbox;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface SmsOutboxRepository extends JpaRepository<SmsOutbox, UUID> {
    List<SmsOutbox> findByStatusInOrderByCreatedAtAsc(List<String> statuses, Pageable pageable);
    long countByStatus(String status);
}
