package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.FieldRoster;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FieldRosterRepository extends JpaRepository<FieldRoster, UUID> {
    Optional<FieldRoster> findByPhoneE164(String phoneE164);
    Optional<FieldRoster> findByPhoneE164AndStatus(String phoneE164, String status);
    List<FieldRoster> findByStateOrderByCreatedAtDesc(String state);
    List<FieldRoster> findByStateInOrderByCreatedAtDesc(List<String> states);
    Page<FieldRoster> findByState(String state, Pageable pageable);
    long countByState(String state);
    long countByStateIn(List<String> states);
}
