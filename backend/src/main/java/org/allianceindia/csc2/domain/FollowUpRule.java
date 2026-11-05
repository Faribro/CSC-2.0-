package org.allianceindia.csc2.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "follow_up_rule", schema = "csc2")
public class FollowUpRule {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false, unique = true, length = 100)
    private String code;

    @Column(name = "title_en", nullable = false, length = 255)
    private String titleEn;

    @Column(name = "title_hi", nullable = false, length = 255)
    private String titleHi;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(name = "trigger_type", nullable = false, length = 50)
    private String triggerType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "trigger_params", columnDefinition = "jsonb", nullable = false)
    private String triggerParams = "{}";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "interval_spec", columnDefinition = "jsonb", nullable = false)
    private String intervalSpec = "{}";

    @Column(name = "purpose_code", length = 20)
    private String purposeCode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "suggested_service_codes", columnDefinition = "jsonb", nullable = false)
    private String suggestedServiceCodes = "[]";

    @Column(name = "source_name", nullable = false, length = 255)
    private String sourceName;

    @Column(name = "source_edition", nullable = false, length = 100)
    private String sourceEdition;

    @Column(name = "source_url", length = 500)
    private String sourceUrl;

    @Column(name = "source_section", length = 255)
    private String sourceSection;

    @Column(nullable = false, length = 30)
    private String status = "DRAFT"; // DRAFT, IN_REVIEW, APPROVED, ACTIVE, RETIRED

    @Version
    @Column(nullable = false)
    private int version;

    @Column(name = "effective_from")
    private Instant effectiveFrom;

    @Column(name = "effective_to")
    private Instant effectiveTo;

    @Column(nullable = false, length = 50)
    private String scope = "NATIONAL";

    @Column(name = "created_by", nullable = false, length = 150)
    private String createdBy;

    @Column(name = "reviewed_by", length = 150)
    private String reviewedBy;

    @Column(name = "approved_by", length = 150)
    private String approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "change_note", columnDefinition = "TEXT")
    private String changeNote;

    @Column(name = "auto_create_tasks", nullable = false)
    private boolean autoCreateTasks = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public FollowUpRule() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getTitleEn() { return titleEn; }
    public void setTitleEn(String titleEn) { this.titleEn = titleEn; }

    public String getTitleHi() { return titleHi; }
    public void setTitleHi(String titleHi) { this.titleHi = titleHi; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getTriggerType() { return triggerType; }
    public void setTriggerType(String triggerType) { this.triggerType = triggerType; }

    public String getTriggerParams() { return triggerParams; }
    public void setTriggerParams(String triggerParams) { this.triggerParams = triggerParams; }

    public String getIntervalSpec() { return intervalSpec; }
    public void setIntervalSpec(String intervalSpec) { this.intervalSpec = intervalSpec; }

    public String getPurposeCode() { return purposeCode; }
    public void setPurposeCode(String purposeCode) { this.purposeCode = purposeCode; }

    public String getSuggestedServiceCodes() { return suggestedServiceCodes; }
    public void setSuggestedServiceCodes(String suggestedServiceCodes) { this.suggestedServiceCodes = suggestedServiceCodes; }

    public String getSourceName() { return sourceName; }
    public void setSourceName(String sourceName) { this.sourceName = sourceName; }

    public String getSourceEdition() { return sourceEdition; }
    public void setSourceEdition(String sourceEdition) { this.sourceEdition = sourceEdition; }

    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }

    public String getSourceSection() { return sourceSection; }
    public void setSourceSection(String sourceSection) { this.sourceSection = sourceSection; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }

    public Instant getEffectiveFrom() { return effectiveFrom; }
    public void setEffectiveFrom(Instant effectiveFrom) { this.effectiveFrom = effectiveFrom; }

    public Instant getEffectiveTo() { return effectiveTo; }
    public void setEffectiveTo(Instant effectiveTo) { this.effectiveTo = effectiveTo; }

    public String getScope() { return scope; }
    public void setScope(String scope) { this.scope = scope; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(String reviewedBy) { this.reviewedBy = reviewedBy; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    public Instant getApprovedAt() { return approvedAt; }
    public void setApprovedAt(Instant approvedAt) { this.approvedAt = approvedAt; }

    public String getChangeNote() { return changeNote; }
    public void setChangeNote(String changeNote) { this.changeNote = changeNote; }

    public boolean isAutoCreateTasks() { return autoCreateTasks; }
    public void setAutoCreateTasks(boolean autoCreateTasks) { this.autoCreateTasks = autoCreateTasks; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
