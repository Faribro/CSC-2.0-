package org.allianceindia.csc2.domain;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "planned_services", schema = "csc2")
public class PlannedService {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task;

    @Column(name = "service_code", nullable = false, length = 50)
    private String serviceCode;

    @Column(name = "service_name", nullable = false, length = 150)
    private String serviceName;

    @Column(name = "target_due_date", nullable = false)
    private LocalDate targetDueDate;

    @Column(nullable = false, length = 30)
    private String status = "PLANNED"; // 'PLANNED', 'DELIVERED', 'CANCELLED'

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Version
    @Column(nullable = false)
    private int version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public PlannedService() {}

    public PlannedService(Client client, Task task, String serviceCode, String serviceName, LocalDate targetDueDate, String notes) {
        this.client = client;
        this.task = task;
        this.serviceCode = serviceCode;
        this.serviceName = serviceName;
        this.targetDueDate = targetDueDate;
        this.notes = notes;
        this.status = "PLANNED";
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Client getClient() { return client; }
    public void setClient(Client client) { this.client = client; }
    public Task getTask() { return task; }
    public void setTask(Task task) { this.task = task; }
    public String getServiceCode() { return serviceCode; }
    public void setServiceCode(String serviceCode) { this.serviceCode = serviceCode; }
    public String getServiceName() { return serviceName; }
    public void setServiceName(String serviceName) { this.serviceName = serviceName; }
    public LocalDate getTargetDueDate() { return targetDueDate; }
    public void setTargetDueDate(LocalDate targetDueDate) { this.targetDueDate = targetDueDate; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
