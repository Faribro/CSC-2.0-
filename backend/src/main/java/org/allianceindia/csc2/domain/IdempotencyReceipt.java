package org.allianceindia.csc2.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "idempotency_receipts", schema = "csc2")
public class IdempotencyReceipt {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 128)
    private String idempotencyKey;

    @Column(name = "actor_id")
    private UUID actorId;

    @Column(nullable = false, length = 255)
    private String endpoint;

    @Column(name = "request_hash", nullable = false, length = 64)
    private String requestHash;

    @Column(name = "http_status", nullable = false)
    private int httpStatus;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "response_body", columnDefinition = "jsonb", nullable = false)
    private String responseBody;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public IdempotencyReceipt() {}

    public IdempotencyReceipt(String idempotencyKey, UUID actorId, String endpoint, String requestHash, int httpStatus, String responseBody) {
        this.idempotencyKey = idempotencyKey;
        this.actorId = actorId;
        this.endpoint = endpoint;
        this.requestHash = requestHash;
        this.httpStatus = httpStatus;
        this.responseBody = responseBody;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
    public UUID getActorId() { return actorId; }
    public void setActorId(UUID actorId) { this.actorId = actorId; }
    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
    public String getRequestHash() { return requestHash; }
    public void setRequestHash(String requestHash) { this.requestHash = requestHash; }
    public int getHttpStatus() { return httpStatus; }
    public void setHttpStatus(int httpStatus) { this.httpStatus = httpStatus; }
    public String getResponseBody() { return responseBody; }
    public void setResponseBody(String responseBody) { this.responseBody = responseBody; }
    public Instant getCreatedAt() { return createdAt; }
}
