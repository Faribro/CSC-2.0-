package org.allianceindia.csc2.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "audit_log", schema = "csc2")
public class AuditEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt = Instant.now();

    @Column(name = "actor_id")
    private UUID actorId;

    @Column(name = "actor_username", length = 100)
    private String actorUsername;

    @Column(name = "center_id", length = 64)
    private String centerId;

    @Column(nullable = false, length = 100)
    private String action; // e.g. 'CLIENT_REGISTERED', 'CONTACT_ATTEMPT_RECORDED', 'SERVICE_DELIVERED'

    @Column(name = "resource_type", nullable = false, length = 50)
    private String resourceType; // 'CLIENT', 'TASK', 'CONTACT_ATTEMPT', 'ENCOUNTER', 'DELIVERED_SERVICE'

    @Column(name = "resource_id", nullable = false)
    private UUID resourceId;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String payload;

    public AuditEvent() {}

    public AuditEvent(UUID actorId, String actorUsername, String centerId, String action, String resourceType, UUID resourceId, String ipAddress, String payload) {
        this.occurredAt = Instant.now();
        this.actorId = actorId;
        this.actorUsername = actorUsername;
        this.centerId = centerId;
        this.action = action;
        this.resourceType = resourceType;
        this.resourceId = resourceId;
        this.ipAddress = ipAddress;
        this.payload = payload;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Instant getOccurredAt() { return occurredAt; }
    public UUID getActorId() { return actorId; }
    public void setActorId(UUID actorId) { this.actorId = actorId; }
    public String getActorUsername() { return actorUsername; }
    public void setActorUsername(String actorUsername) { this.actorUsername = actorUsername; }
    public String getCenterId() { return centerId; }
    public void setCenterId(String centerId) { this.centerId = centerId; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getResourceType() { return resourceType; }
    public void setResourceType(String resourceType) { this.resourceType = resourceType; }
    public UUID getResourceId() { return resourceId; }
    public void setResourceId(UUID resourceId) { this.resourceId = resourceId; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }
}
