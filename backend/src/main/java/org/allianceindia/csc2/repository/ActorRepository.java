package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.Actor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface ActorRepository extends JpaRepository<Actor, UUID> {
    Optional<Actor> findByUsername(String username);
    Optional<Actor> findByActorRef(String actorRef);
}
