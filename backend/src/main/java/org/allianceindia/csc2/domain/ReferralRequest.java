package org.allianceindia.csc2.domain;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "referral_requests", schema = "csc2")
public class ReferralRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @Column(name = "referred_by", nullable = false)
    private UUID referredBy;

    @Column(name = "referral_date", nullable = false)
    private LocalDate referralDate;

    @Column(name = "service_category", nullable = false, length = 100)
    private String serviceCategory;

    @Column(name = "target_facility", nullable = false, length = 200)
    private String targetFacility;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(nullable = false, length = 30)
    private String status = "REFERRED"; // 'REFERRED', 'COMPLETED', 'LOST_TO_FOLLOWUP', 'CANCELLED'

    @Column(name = "outcome_date")
    private LocalDate outcomeDate;

    @Column(name = "outcome_notes", columnDefinition = "TEXT")
    private String outcomeNotes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public ReferralRequest() {}

    public ReferralRequest(Client client, UUID referredBy, LocalDate referralDate, String serviceCategory, String targetFacility, String reason) {
        this.client = client;
        this.referredBy = referredBy;
        this.referralDate = referralDate;
        this.serviceCategory = serviceCategory;
        this.targetFacility = targetFacility;
        this.reason = reason;
        this.status = "REFERRED";
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Client getClient() { return client; }
    public void setClient(Client client) { this.client = client; }
    public UUID getReferredBy() { return referredBy; }
    public void setReferredBy(UUID referredBy) { this.referredBy = referredBy; }
    public LocalDate getReferralDate() { return referralDate; }
    public void setReferralDate(LocalDate referralDate) { this.referralDate = referralDate; }
    public String getServiceCategory() { return serviceCategory; }
    public void setServiceCategory(String serviceCategory) { this.serviceCategory = serviceCategory; }
    public String getTargetFacility() { return targetFacility; }
    public void setTargetFacility(String targetFacility) { this.targetFacility = targetFacility; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDate getOutcomeDate() { return outcomeDate; }
    public void setOutcomeDate(LocalDate outcomeDate) { this.outcomeDate = outcomeDate; }
    public String getOutcomeNotes() { return outcomeNotes; }
    public void setOutcomeNotes(String outcomeNotes) { this.outcomeNotes = outcomeNotes; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
