package org.allianceindia.csc2.domain;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "encounters", schema = "csc2")
public class Encounter {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @Column(name = "actor_id", nullable = false)
    private UUID actorId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task;

    @Column(name = "observation_date", nullable = false)
    private LocalDate observationDate; // Date clinical visit occurred

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private Instant recordedAt = Instant.now(); // Date record entered into system

    @Column(name = "encounter_type", nullable = false, length = 50)
    private String encounterType; // 'HOME_VISIT', 'CSC_VISIT', 'PHONE_COUNSELING'

    @Column(name = "art_adherence_assessment", length = 50)
    private String artAdherenceAssessment;

    @Column(name = "nutrition_assessment", length = 50)
    private String nutritionAssessment;

    @Column(name = "mental_health_notes", columnDefinition = "TEXT")
    private String mentalHealthNotes;

    @Column(name = "general_notes", columnDefinition = "TEXT")
    private String generalNotes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Encounter() {}

    public Encounter(Client client, UUID actorId, Task task, LocalDate observationDate, String encounterType) {
        this.client = client;
        this.actorId = actorId;
        this.task = task;
        this.observationDate = observationDate;
        this.recordedAt = Instant.now();
        this.encounterType = encounterType;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Client getClient() { return client; }
    public void setClient(Client client) { this.client = client; }
    public UUID getActorId() { return actorId; }
    public void setActorId(UUID actorId) { this.actorId = actorId; }
    public Task getTask() { return task; }
    public void setTask(Task task) { this.task = task; }
    public LocalDate getObservationDate() { return observationDate; }
    public void setObservationDate(LocalDate observationDate) { this.observationDate = observationDate; }
    public Instant getRecordedAt() { return recordedAt; }
    public String getEncounterType() { return encounterType; }
    public void setEncounterType(String encounterType) { this.encounterType = encounterType; }
    public String getArtAdherenceAssessment() { return artAdherenceAssessment; }
    public void setArtAdherenceAssessment(String artAdherenceAssessment) { this.artAdherenceAssessment = artAdherenceAssessment; }
    public String getNutritionAssessment() { return nutritionAssessment; }
    public void setNutritionAssessment(String nutritionAssessment) { this.nutritionAssessment = nutritionAssessment; }
    public String getMentalHealthNotes() { return mentalHealthNotes; }
    public void setMentalHealthNotes(String mentalHealthNotes) { this.mentalHealthNotes = mentalHealthNotes; }
    public String getGeneralNotes() { return generalNotes; }
    public void setGeneralNotes(String generalNotes) { this.generalNotes = generalNotes; }
    public Instant getCreatedAt() { return createdAt; }
}
