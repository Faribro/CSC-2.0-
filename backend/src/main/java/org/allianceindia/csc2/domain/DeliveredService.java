package org.allianceindia.csc2.domain;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "delivered_services", schema = "csc2")
public class DeliveredService {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "planned_service_id")
    private PlannedService plannedService;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @Column(name = "delivered_by", nullable = false)
    private UUID deliveredBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task;

    @Column(name = "delivery_date", nullable = false)
    private LocalDate deliveryDate;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private Instant recordedAt = Instant.now();

    @Column(name = "service_code", nullable = false, length = 50)
    private String serviceCode;

    @Column(name = "facility_name", length = 150)
    private String facilityName;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public DeliveredService() {}

    public DeliveredService(PlannedService plannedService, Client client, UUID deliveredBy, Task task, LocalDate deliveryDate, String serviceCode, String facilityName, String notes) {
        this.plannedService = plannedService;
        this.client = client;
        this.deliveredBy = deliveredBy;
        this.task = task;
        this.deliveryDate = deliveryDate;
        this.recordedAt = Instant.now();
        this.serviceCode = serviceCode;
        this.facilityName = facilityName;
        this.notes = notes;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public PlannedService getPlannedService() { return plannedService; }
    public void setPlannedService(PlannedService plannedService) { this.plannedService = plannedService; }
    public Client getClient() { return client; }
    public void setClient(Client client) { this.client = client; }
    public UUID getDeliveredBy() { return deliveredBy; }
    public void setDeliveredBy(UUID deliveredBy) { this.deliveredBy = deliveredBy; }
    public Task getTask() { return task; }
    public void setTask(Task task) { this.task = task; }
    public LocalDate getDeliveryDate() { return deliveryDate; }
    public void setDeliveryDate(LocalDate deliveryDate) { this.deliveryDate = deliveryDate; }
    public Instant getRecordedAt() { return recordedAt; }
    public String getServiceCode() { return serviceCode; }
    public void setServiceCode(String serviceCode) { this.serviceCode = serviceCode; }
    public String getFacilityName() { return facilityName; }
    public void setFacilityName(String facilityName) { this.facilityName = facilityName; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Instant getCreatedAt() { return createdAt; }
}
