package org.allianceindia.csc2.repository;

import jakarta.persistence.LockModeType;
import org.allianceindia.csc2.domain.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {
    
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM Task t WHERE t.id = :id AND t.centerId IN :centerIds")
    Optional<Task> findByIdAndCenterIdInWithLock(@Param("id") UUID id, @Param("centerIds") Collection<String> centerIds);

    Optional<Task> findByIdAndCenterIdIn(UUID id, Collection<String> centerIds);

    // Worklist queries
    @Query("SELECT t FROM Task t JOIN FETCH t.client WHERE t.centerId IN :centerIds AND t.dueDate = :today AND t.status IN ('PENDING', 'DUE', 'OVERDUE') ORDER BY t.dueDate ASC")
    List<Task> findTodayTasks(@Param("centerIds") Collection<String> centerIds, @Param("today") LocalDate today);

    @Query("SELECT t FROM Task t JOIN FETCH t.client WHERE t.centerId IN :centerIds AND t.dueDate < :today AND t.status IN ('PENDING', 'DUE', 'OVERDUE') ORDER BY t.dueDate ASC")
    List<Task> findOverdueTasks(@Param("centerIds") Collection<String> centerIds, @Param("today") LocalDate today);

    @Query("SELECT t FROM Task t JOIN FETCH t.client WHERE t.centerId IN :centerIds AND t.dueDate > :today AND t.status IN ('PENDING', 'DUE') ORDER BY t.dueDate ASC")
    List<Task> findUpcomingTasks(@Param("centerIds") Collection<String> centerIds, @Param("today") LocalDate today);

    List<Task> findByClientIdOrderByDueDateAsc(UUID clientId);
    long countByClientIdAndStatusIn(UUID clientId, Collection<String> statuses);
}
