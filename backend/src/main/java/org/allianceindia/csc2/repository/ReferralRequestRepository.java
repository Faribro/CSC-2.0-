package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.ReferralRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ReferralRequestRepository extends JpaRepository<ReferralRequest, UUID> {
    List<ReferralRequest> findByClientIdOrderByReferralDateDesc(UUID clientId);
}
