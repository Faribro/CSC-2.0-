package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.ClientTrackingTag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClientTrackingTagRepository extends JpaRepository<ClientTrackingTag, UUID> {
    List<ClientTrackingTag> findByClientIdOrderByEventDateDesc(UUID clientId);
    Optional<ClientTrackingTag> findFirstByClientIdAndTagTypeOrderByEventDateDesc(UUID clientId, String tagType);
}
