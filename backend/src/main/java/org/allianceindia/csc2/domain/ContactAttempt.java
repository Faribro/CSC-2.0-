package org.allianceindia.csc2.domain;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "contact_attempts", schema = "csc2")
public class ContactAttempt {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @Column(name = "actor_id", nullable = false)
    private UUID actorId;

    @Column(name = "attempt_date", nullable = false)
    private LocalDate attemptDate;

    @Column(name = "attempt_time", nullable = false)
    private LocalTime attemptTime = LocalTime.now();

    @Column(nullable = false, length = 30)
    private String channel; // 'PHONE', 'HOME_VISIT', 'PHYSICAL_CSC', 'WHATSAPP'

    @Column(nullable = false, length = 30)
    private String outcome; // 'reached', 'not_reached', 'refused'

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public ContactAttempt() {}

    public ContactAttempt(Task task, Client client, UUID actorId, LocalDate attemptDate, String channel, String outcome, String notes) {
        this.task = task;
        this.client = client;
        this.actorId = actorId;
        this.attemptDate = attemptDate;
        this.attemptTime = LocalTime.now();
        this.channel = channel;
        this.outcome = outcome;
        this.notes = notes;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Task getTask() { return task; }
    public void setTask(Task task) { this.task = task; }
    public Client getClient() { return client; }
    public void setClient(Client client) { this.client = client; }
    public UUID getActorId() { return actorId; }
    public void setActorId(UUID actorId) { this.actorId = actorId; }
    public LocalDate getAttemptDate() { return attemptDate; }
    public void setAttemptDate(LocalDate attemptDate) { this.attemptDate = attemptDate; }
    public LocalTime getAttemptTime() { return attemptTime; }
    public void setAttemptTime(LocalTime attemptTime) { this.attemptTime = attemptTime; }
    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }
    public String getOutcome() { return outcome; }
    public void setOutcome(String outcome) { this.outcome = outcome; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Instant getCreatedAt() { return createdAt; }
}
