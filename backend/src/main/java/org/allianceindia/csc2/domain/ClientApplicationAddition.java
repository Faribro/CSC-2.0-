package org.allianceindia.csc2.domain;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "client_application_addition", schema = "csc2")
public class ClientApplicationAddition {
    @Id
    @Column(name = "client_id")
    private UUID clientId;

    @Column(name = "is_enabled", nullable = false)
    private boolean enabled = false;

    @Column(name = "last_art_centre_contact_date")
    private LocalDate lastArtCentreContactDate;

    @Column(name = "art_centre_next_due_date")
    private LocalDate artCentreNextDueDate;

    @Column(name = "latest_viral_load_date")
    private LocalDate latestViralLoadDate;

    @Column(name = "pregnancy_status", length = 50)
    private String pregnancyStatus;

    @Column(name = "expected_delivery_date")
    private LocalDate expectedDeliveryDate;

    @Column(name = "infant_dob")
    private LocalDate infantDob;

    @Column(name = "updated_by", length = 150)
    private String updatedBy;

    @Version
    @Column(nullable = false)
    private int version;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public ClientApplicationAddition() {}

    public ClientApplicationAddition(UUID clientId) {
        this.clientId = clientId;
        this.enabled = false;
        this.updatedAt = Instant.now();
    }

    public UUID getClientId() { return clientId; }
    public void setClientId(UUID clientId) { this.clientId = clientId; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public LocalDate getLastArtCentreContactDate() { return lastArtCentreContactDate; }
    public void setLastArtCentreContactDate(LocalDate lastArtCentreContactDate) { this.lastArtCentreContactDate = lastArtCentreContactDate; }

    public LocalDate getArtCentreNextDueDate() { return artCentreNextDueDate; }
    public void setArtCentreNextDueDate(LocalDate artCentreNextDueDate) { this.artCentreNextDueDate = artCentreNextDueDate; }

    public LocalDate getLatestViralLoadDate() { return latestViralLoadDate; }
    public void setLatestViralLoadDate(LocalDate latestViralLoadDate) { this.latestViralLoadDate = latestViralLoadDate; }

    public String getPregnancyStatus() { return pregnancyStatus; }
    public void setPregnancyStatus(String pregnancyStatus) { this.pregnancyStatus = pregnancyStatus; }

    public LocalDate getExpectedDeliveryDate() { return expectedDeliveryDate; }
    public void setExpectedDeliveryDate(LocalDate expectedDeliveryDate) { this.expectedDeliveryDate = expectedDeliveryDate; }

    public LocalDate getInfantDob() { return infantDob; }
    public void setInfantDob(LocalDate infantDob) { this.infantDob = infantDob; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }

    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
