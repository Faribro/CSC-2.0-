package org.allianceindia.csc2.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "device_session", schema = "csc2")
public class DeviceSession {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "field_user_id", nullable = false)
    private UUID fieldUserId;

    @Column(name = "device_id", nullable = false, length = 100)
    private String deviceId;

    @Column(name = "phone_e164", nullable = false, length = 20)
    private String phoneE164;

    @Column(name = "session_token_hash", nullable = false, unique = true, length = 64)
    private String sessionTokenHash;

    @Column(name = "refresh_token_hash", nullable = false, unique = true, length = 64)
    private String refreshTokenHash;

    @Column(name = "idle_expires_at", nullable = false)
    private Instant idleExpiresAt;

    @Column(name = "absolute_expires_at", nullable = false)
    private Instant absoluteExpiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "last_used_at", nullable = false)
    private Instant lastUsedAt = Instant.now();

    public DeviceSession() {}

    public DeviceSession(UUID fieldUserId, String deviceId, String phoneE164, String sessionTokenHash,
                         String refreshTokenHash, Instant idleExpiresAt, Instant absoluteExpiresAt) {
        this.fieldUserId = fieldUserId;
        this.deviceId = deviceId;
        this.phoneE164 = phoneE164;
        this.sessionTokenHash = sessionTokenHash;
        this.refreshTokenHash = refreshTokenHash;
        this.idleExpiresAt = idleExpiresAt;
        this.absoluteExpiresAt = absoluteExpiresAt;
        this.createdAt = Instant.now();
        this.lastUsedAt = Instant.now();
    }

    public boolean isActive() {
        if (revokedAt != null) return false;
        Instant now = Instant.now();
        return now.isBefore(idleExpiresAt) && now.isBefore(absoluteExpiresAt);
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getFieldUserId() { return fieldUserId; }
    public void setFieldUserId(UUID fieldUserId) { this.fieldUserId = fieldUserId; }
    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }
    public String getPhoneE164() { return phoneE164; }
    public void setPhoneE164(String phoneE164) { this.phoneE164 = phoneE164; }
    public String getSessionTokenHash() { return sessionTokenHash; }
    public void setSessionTokenHash(String sessionTokenHash) { this.sessionTokenHash = sessionTokenHash; }
    public String getRefreshTokenHash() { return refreshTokenHash; }
    public void setRefreshTokenHash(String refreshTokenHash) { this.refreshTokenHash = refreshTokenHash; }
    public Instant getIdleExpiresAt() { return idleExpiresAt; }
    public void setIdleExpiresAt(Instant idleExpiresAt) { this.idleExpiresAt = idleExpiresAt; }
    public Instant getAbsoluteExpiresAt() { return absoluteExpiresAt; }
    public void setAbsoluteExpiresAt(Instant absoluteExpiresAt) { this.absoluteExpiresAt = absoluteExpiresAt; }
    public Instant getRevokedAt() { return revokedAt; }
    public void setRevokedAt(Instant revokedAt) { this.revokedAt = revokedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getLastUsedAt() { return lastUsedAt; }
    public void setLastUsedAt(Instant lastUsedAt) { this.lastUsedAt = lastUsedAt; }
}
