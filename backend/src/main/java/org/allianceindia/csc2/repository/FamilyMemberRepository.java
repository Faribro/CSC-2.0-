package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.FamilyMember;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface FamilyMemberRepository extends JpaRepository<FamilyMember, UUID> {
    List<FamilyMember> findByClientId(UUID clientId);
    List<FamilyMember> findByClientIdAndDeletedFalse(UUID clientId);
}
