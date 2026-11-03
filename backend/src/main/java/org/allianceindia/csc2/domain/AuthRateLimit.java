package org.allianceindia.csc2.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "auth_rate_limit", schema = "csc2")
public class AuthRateLimit {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "rate_key", nullable = false, length = 255)
    private String rateKey;

    @Column(name = "attempt_at", nullable = false, updatable = false)
    private Instant attemptAt = Instant.now();

    public AuthRateLimit() {}

    public AuthRateLimit(String rateKey) {
        this.rateKey = rateKey;
        this.attemptAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getRateKey() { return rateKey; }
    public void setRateKey(String rateKey) { this.rateKey = rateKey; }
    public Instant getAttemptAt() { return attemptAt; }
    public void setAttemptAt(Instant attemptAt) { this.attemptAt = attemptAt; }
}
