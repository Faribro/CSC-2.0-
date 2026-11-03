package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.ProfileRevision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProfileRevisionRepository extends JpaRepository<ProfileRevision, UUID> {
    List<ProfileRevision> findByClientIdOrderByRevisionNumberDesc(UUID clientId);
}
