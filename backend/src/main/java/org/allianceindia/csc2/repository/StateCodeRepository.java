package org.allianceindia.csc2.repository;

import jakarta.persistence.LockModeType;
import org.allianceindia.csc2.domain.StateCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StateCodeRepository extends JpaRepository<StateCode, UUID> {

    Optional<StateCode> findByStateIgnoreCaseAndStatus(String state, String status);

    Optional<StateCode> findByCodeVerifier(String codeVerifier);

    List<StateCode> findByStateIgnoreCase(String state);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT sc FROM StateCode sc WHERE sc.id = :id")
    Optional<StateCode> findByIdForUpdate(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT sc FROM StateCode sc WHERE sc.codeVerifier = :verifier")
    Optional<StateCode> findByCodeVerifierForUpdate(@Param("verifier") String verifier);
}
