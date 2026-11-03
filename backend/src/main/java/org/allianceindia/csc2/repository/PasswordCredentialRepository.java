package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.PasswordCredential;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface PasswordCredentialRepository extends JpaRepository<PasswordCredential, UUID> {
    Optional<PasswordCredential> findByUserId(UUID userId);
    void deleteByUserId(UUID userId);
}
