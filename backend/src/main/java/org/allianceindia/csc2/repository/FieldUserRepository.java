package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.FieldUser;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FieldUserRepository extends JpaRepository<FieldUser, UUID> {
    Optional<FieldUser> findByPhoneE164(String phoneE164);
    Optional<FieldUser> findByIdAndStatus(UUID id, String status);
    List<FieldUser> findByStateAndStatus(String state, String status);
}
