package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.ArtCentrePriorityImport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ArtCentrePriorityImportRepository extends JpaRepository<ArtCentrePriorityImport, UUID> {
    Optional<ArtCentrePriorityImport> findBySha256Hash(String sha256Hash);
}
