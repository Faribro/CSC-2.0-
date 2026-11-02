package org.allianceindia.csc2.domain;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tasks", schema = "csc2")
public class Task {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "task_ref", nullable = false, unique = true, length = 64)
    private String taskRef;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @Column(name = "assigned_worker_id")
    private UUID assignedWorkerId;

    @Column(name = "center_id", nullable = false, length = 64)
    private String centerId;

    @Column(name = "task_type", nullable = false, length = 50)
    private String taskType; // 'FOLLOW_UP_VISIT', 'ART_REFILL_DUE', 'VIRAL_LOAD_DUE', 'SOCIAL_PROTECTION'

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(nullable = false, length = 30)
    private String status = "PENDING"; // 'PENDING', 'DUE', 'OVERDUE', 'DELIVERED', 'CANCELLED'

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "completed_by")
    private UUID completedBy;

    @Version
    @Column(nullable = false)
    private int version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Task() {}

    public Task(String taskRef, Client client, UUID assignedWorkerId, String centerId, String taskType, String title, LocalDate dueDate) {
        this.taskRef = taskRef;
        this.client = client;
        this.assignedWorkerId = assignedWorkerId;
        this.centerId = centerId;
        this.taskType = taskType;
        this.title = title;
        this.dueDate = dueDate;
        this.status = "PENDING";
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getTaskRef() { return taskRef; }
    public void setTaskRef(String taskRef) { this.taskRef = taskRef; }
    public Client getClient() { return client; }
    public void setClient(Client client) { this.client = client; }
    public UUID getAssignedWorkerId() { return assignedWorkerId; }
    public void setAssignedWorkerId(UUID assignedWorkerId) { this.assignedWorkerId = assignedWorkerId; }
    public String getCenterId() { return centerId; }
    public void setCenterId(String centerId) { this.centerId = centerId; }
    public String getTaskType() { return taskType; }
    public void setTaskType(String taskType) { this.taskType = taskType; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
    public UUID getCompletedBy() { return completedBy; }
    public void setCompletedBy(UUID completedBy) { this.completedBy = completedBy; }
    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
