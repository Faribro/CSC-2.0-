package org.allianceindia.csc2.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "observations", schema = "csc2")
public class Observation {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "encounter_id")
    private Encounter encounter;

    @Column(name = "observation_date", nullable = false)
    private LocalDate observationDate;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private Instant recordedAt = Instant.now();

    @Column(name = "observation_code", nullable = false, length = 50)
    private String observationCode; // 'CD4_COUNT', 'CD4_PCT', 'VIRAL_LOAD', 'WEIGHT_KG', 'MUAC_CM'

    @Column(name = "value_numeric", precision = 10, scale = 2)
    private BigDecimal valueNumeric;

    @Column(name = "value_text", length = 100)
    private String valueText;

    @Column(length = 30)
    private String unit;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Observation() {}

    public Observation(Client client, Encounter encounter, LocalDate observationDate, String observationCode, BigDecimal valueNumeric, String unit) {
        this.client = client;
        this.encounter = encounter;
        this.observationDate = observationDate;
        this.recordedAt = Instant.now();
        this.observationCode = observationCode;
        this.valueNumeric = valueNumeric;
        this.unit = unit;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Client getClient() { return client; }
    public void setClient(Client client) { this.client = client; }
    public Encounter getEncounter() { return encounter; }
    public void setEncounter(Encounter encounter) { this.encounter = encounter; }
    public LocalDate getObservationDate() { return observationDate; }
    public void setObservationDate(LocalDate observationDate) { this.observationDate = observationDate; }
    public Instant getRecordedAt() { return recordedAt; }
    public String getObservationCode() { return observationCode; }
    public void setObservationCode(String observationCode) { this.observationCode = observationCode; }
    public BigDecimal getValueNumeric() { return valueNumeric; }
    public void setValueNumeric(BigDecimal valueNumeric) { this.valueNumeric = valueNumeric; }
    public String getValueText() { return valueText; }
    public void setValueText(String valueText) { this.valueText = valueText; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public Instant getCreatedAt() { return createdAt; }
}
