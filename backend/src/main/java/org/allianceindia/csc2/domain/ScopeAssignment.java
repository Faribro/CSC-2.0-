package org.allianceindia.csc2.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "scope_assignments", schema = "csc2")
public class ScopeAssignment {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id", nullable = false)
    private Actor actor;

    @Column(name = "center_id", nullable = false, length = 64)
    private String centerId;

    @Column(length = 100)
    private String district;

    @Column(length = 100)
    private String state;

    @Column(name = "granted_at", nullable = false)
    private Instant grantedAt = Instant.now();

    @Column(name = "expires_at")
    private Instant expiresAt;

    public ScopeAssignment() {}

    public ScopeAssignment(Actor actor, String centerId, String district, String state) {
        this.actor = actor;
        this.centerId = centerId;
        this.district = district;
        this.state = state;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Actor getActor() { return actor; }
    public void setActor(Actor actor) { this.actor = actor; }
    public String getCenterId() { return centerId; }
    public void setCenterId(String centerId) { this.centerId = centerId; }
    public String getDistrict() { return district; }
    public void setDistrict(String district) { this.district = district; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public Instant getGrantedAt() { return grantedAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
}
