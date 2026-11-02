package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.IdempotencyReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface IdempotencyReceiptRepository extends JpaRepository<IdempotencyReceipt, UUID> {
    Optional<IdempotencyReceipt> findByIdempotencyKey(String idempotencyKey);
}
