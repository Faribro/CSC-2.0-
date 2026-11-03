package org.allianceindia.csc2.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "profile_revisions", schema = "csc2",
       uniqueConstraints = @UniqueConstraint(name = "uq_client_revision", columnNames = {"client_id", "revision_number"}))
public class ProfileRevision {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @Column(name = "revision_number", nullable = false)
    private int revisionNumber;

    @Column(name = "author_id")
    private UUID authorId;

    @Column(name = "author_name", length = 150)
    private String authorName;

    @Column(name = "change_reason", nullable = false, columnDefinition = "TEXT")
    private String changeReason;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "diff", nullable = false, columnDefinition = "jsonb")
    private String diff;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "snapshot", nullable = false, columnDefinition = "jsonb")
    private String snapshot;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public ProfileRevision() {}

    public ProfileRevision(Client client, int revisionNumber, UUID authorId, String authorName,
                           String changeReason, String diff, String snapshot) {
        this.client = client;
        this.revisionNumber = revisionNumber;
        this.authorId = authorId;
        this.authorName = authorName;
        this.changeReason = changeReason;
        this.diff = diff;
        this.snapshot = snapshot;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Client getClient() { return client; }
    public void setClient(Client client) { this.client = client; }
    public int getRevisionNumber() { return revisionNumber; }
    public void setRevisionNumber(int revisionNumber) { this.revisionNumber = revisionNumber; }
    public UUID getAuthorId() { return authorId; }
    public void setAuthorId(UUID authorId) { this.authorId = authorId; }
    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }
    public String getChangeReason() { return changeReason; }
    public void setChangeReason(String changeReason) { this.changeReason = changeReason; }
    public String getDiff() { return diff; }
    public void setDiff(String diff) { this.diff = diff; }
    public String getSnapshot() { return snapshot; }
    public void setSnapshot(String snapshot) { this.snapshot = snapshot; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
