package org.allianceindia.csc2.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "follow_up_rule_history", schema = "csc2")
public class FollowUpRuleHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rule_id", nullable = false)
    private FollowUpRule rule;

    @Column(nullable = false)
    private int version;

    @Column(nullable = false, length = 30)
    private String status;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "rule_snapshot", columnDefinition = "jsonb", nullable = false)
    private String ruleSnapshot;

    @Column(name = "changed_by", nullable = false, length = 150)
    private String changedBy;

    @Column(name = "change_note", columnDefinition = "TEXT")
    private String changeNote;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public FollowUpRuleHistory() {}

    public FollowUpRuleHistory(FollowUpRule rule, int version, String status, String ruleSnapshot, String changedBy, String changeNote) {
        this.rule = rule;
        this.version = version;
        this.status = status;
        this.ruleSnapshot = ruleSnapshot;
        this.changedBy = changedBy;
        this.changeNote = changeNote;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public FollowUpRule getRule() { return rule; }
    public void setRule(FollowUpRule rule) { this.rule = rule; }

    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRuleSnapshot() { return ruleSnapshot; }
    public void setRuleSnapshot(String ruleSnapshot) { this.ruleSnapshot = ruleSnapshot; }

    public String getChangedBy() { return changedBy; }
    public void setChangedBy(String changedBy) { this.changedBy = changedBy; }

    public String getChangeNote() { return changeNote; }
    public void setChangeNote(String changeNote) { this.changeNote = changeNote; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
