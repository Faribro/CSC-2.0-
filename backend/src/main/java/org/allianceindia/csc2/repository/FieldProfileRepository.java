package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.FieldProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface FieldProfileRepository extends JpaRepository<FieldProfile, UUID> {
    Optional<FieldProfile> findByGoogleSub(String googleSub);
    Optional<FieldProfile> findByUserId(UUID userId);
}
