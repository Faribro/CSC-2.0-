package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.StateReference;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface StateReferenceRepository extends JpaRepository<StateReference, String> {
    Optional<StateReference> findByStateCode(String stateCode);
    Optional<StateReference> findByIsoCode(String isoCode);
    List<StateReference> findByIsActiveTrueOrderByStateNameAsc();
}
