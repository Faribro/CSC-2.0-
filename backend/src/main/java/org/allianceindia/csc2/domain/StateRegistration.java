package org.allianceindia.csc2.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "state_registration", schema = "csc2")
public class StateRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName = "";

    @Column(name = "work_email", nullable = false, unique = true, length = 255)
    private String workEmail;

    @Column(name = "requested_state", nullable = false, length = 100)
    private String requestedState;

    @Column(nullable = false, length = 200)
    private String organization;

    @Column(nullable = false, length = 50)
    private String status = "PENDING_APPROVAL"; // 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED'

    @Column(name = "email_verified_at")
    private Instant emailVerifiedAt;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "approved_by", length = 150)
    private String approvedBy;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public StateRegistration() {}

    public StateRegistration(String firstName, String lastName, String workEmail,
                             String requestedState, String organization) {
        this.firstName = firstName != null ? firstName.trim() : "";
        this.lastName = lastName != null ? lastName.trim() : "";
        this.workEmail = workEmail != null ? workEmail.trim().toLowerCase() : "";
        this.requestedState = requestedState != null ? requestedState.trim() : "";
        this.organization = organization != null ? organization.trim() : "";
        this.status = "PENDING_APPROVAL";
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName != null ? lastName : ""; }
    public String getWorkEmail() { return workEmail; }
    public void setWorkEmail(String workEmail) { this.workEmail = workEmail; }
    public String getRequestedState() { return requestedState; }
    public void setRequestedState(String requestedState) { this.requestedState = requestedState; }
    public String getOrganization() { return organization; }
    public void setOrganization(String organization) { this.organization = organization; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getEmailVerifiedAt() { return emailVerifiedAt; }
    public void setEmailVerifiedAt(Instant emailVerifiedAt) { this.emailVerifiedAt = emailVerifiedAt; }
    public Instant getApprovedAt() { return approvedAt; }
    public void setApprovedAt(Instant approvedAt) { this.approvedAt = approvedAt; }
    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
