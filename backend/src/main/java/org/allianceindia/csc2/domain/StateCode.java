package org.allianceindia.csc2.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "state_code", schema = "csc2")
public class StateCode {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "state_registration_id")
    private StateRegistration stateRegistration;

    @Column(nullable = false, length = 100)
    private String state;

    @Column(name = "code_verifier", nullable = false, length = 64)
    private String codeVerifier; // HMAC-SHA256 hex string with pepper

    @Column(nullable = false, length = 30)
    private String status = "ACTIVE"; // 'ACTIVE', 'ROTATED', 'REVOKED', 'EXPIRED'

    @Column(name = "max_redemptions", nullable = false)
    private int maxRedemptions = 50;

    @Column(name = "redemption_count", nullable = false)
    private int redemptionCount = 0;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "rotated_at")
    private Instant rotatedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    public StateCode() {}

    public StateCode(StateRegistration stateRegistration, String state, String codeVerifier,
                     int maxRedemptions, Instant expiresAt) {
        this.stateRegistration = stateRegistration;
        this.state = state;
        this.codeVerifier = codeVerifier;
        this.status = "ACTIVE";
        this.maxRedemptions = maxRedemptions > 0 ? maxRedemptions : 50;
        this.redemptionCount = 0;
        this.expiresAt = expiresAt;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public StateRegistration getStateRegistration() { return stateRegistration; }
    public void setStateRegistration(StateRegistration stateRegistration) { this.stateRegistration = stateRegistration; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getCodeVerifier() { return codeVerifier; }
    public void setCodeVerifier(String codeVerifier) { this.codeVerifier = codeVerifier; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public int getMaxRedemptions() { return maxRedemptions; }
    public void setMaxRedemptions(int maxRedemptions) { this.maxRedemptions = maxRedemptions; }
    public int getRedemptionCount() { return redemptionCount; }
    public void setRedemptionCount(int redemptionCount) { this.redemptionCount = redemptionCount; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getRotatedAt() { return rotatedAt; }
    public void setRotatedAt(Instant rotatedAt) { this.rotatedAt = rotatedAt; }
    public Instant getRevokedAt() { return revokedAt; }
    public void setRevokedAt(Instant revokedAt) { this.revokedAt = revokedAt; }

    public boolean isExpired() {
        return expiresAt != null && expiresAt.isBefore(Instant.now());
    }

    public boolean isRedemptionAvailable() {
        return "ACTIVE".equals(status) && !isExpired() && redemptionCount < maxRedemptions;
    }
}
