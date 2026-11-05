package org.allianceindia.csc2.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDate;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "rule_suggestion", schema = "csc2")
public class RuleSuggestion {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "task_id")
    private UUID taskId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rule_id", nullable = false)
    private FollowUpRule rule;

    @Column(name = "rule_version", nullable = false)
    private int ruleVersion;

    @Column(name = "suggested_date", nullable = false)
    private LocalDate suggestedDate;

    @Column(name = "suggested_purpose", nullable = false, length = 50)
    private String suggestedPurpose;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "suggested_service_codes", columnDefinition = "jsonb", nullable = false)
    private String suggestedServiceCodes = "[]";

    @Column(name = "explanation_en", nullable = false, columnDefinition = "TEXT")
    private String explanationEn;

    @Column(name = "explanation_hi", nullable = false, columnDefinition = "TEXT")
    private String explanationHi;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "dates_used", columnDefinition = "jsonb", nullable = false)
    private String datesUsed = "{}";

    @Column(nullable = false, length = 30)
    private String outcome = "PENDING"; // PENDING, ACCEPTED, EDITED, DISMISSED

    @Column(name = "dismissed_reason", columnDefinition = "TEXT")
    private String dismissedReason;

    @Column(name = "decided_by", length = 150)
    private String decidedBy;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public RuleSuggestion() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getTaskId() { return taskId; }
    public void setTaskId(UUID taskId) { this.taskId = taskId; }

    public Client getClient() { return client; }
    public void setClient(Client client) { this.client = client; }

    public FollowUpRule getRule() { return rule; }
    public void setRule(FollowUpRule rule) { this.rule = rule; }

    public int getRuleVersion() { return ruleVersion; }
    public void setRuleVersion(int ruleVersion) { this.ruleVersion = ruleVersion; }

    public LocalDate getSuggestedDate() { return suggestedDate; }
    public void setSuggestedDate(LocalDate suggestedDate) { this.suggestedDate = suggestedDate; }

    public String getSuggestedPurpose() { return suggestedPurpose; }
    public void setSuggestedPurpose(String suggestedPurpose) { this.suggestedPurpose = suggestedPurpose; }

    public String getSuggestedServiceCodes() { return suggestedServiceCodes; }
    public void setSuggestedServiceCodes(String suggestedServiceCodes) { this.suggestedServiceCodes = suggestedServiceCodes; }

    public String getExplanationEn() { return explanationEn; }
    public void setExplanationEn(String explanationEn) { this.explanationEn = explanationEn; }

    public String getExplanationHi() { return explanationHi; }
    public void setExplanationHi(String explanationHi) { this.explanationHi = explanationHi; }

    public String getDatesUsed() { return datesUsed; }
    public void setDatesUsed(String datesUsed) { this.datesUsed = datesUsed; }

    public String getOutcome() { return outcome; }
    public void setOutcome(String outcome) { this.outcome = outcome; }

    public String getDismissedReason() { return dismissedReason; }
    public void setDismissedReason(String dismissedReason) { this.dismissedReason = dismissedReason; }

    public String getDecidedBy() { return decidedBy; }
    public void setDecidedBy(String decidedBy) { this.decidedBy = decidedBy; }

    public Instant getDecidedAt() { return decidedAt; }
    public void setDecidedAt(Instant decidedAt) { this.decidedAt = decidedAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
