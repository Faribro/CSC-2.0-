package org.allianceindia.csc2.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "family_members", schema = "csc2")
public class FamilyMember {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 50)
    private String relationship;

    private Integer age;

    @Column(length = 20)
    private String gender;

    @Column(name = "hiv_status", length = 20)
    private String hivStatus;

    @Column(name = "art_number", length = 100)
    private String artNumber;

    @Column(name = "is_deleted", nullable = false)
    private boolean deleted = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public FamilyMember() {}

    public FamilyMember(Client client, String name, String relationship, Integer age, String gender, String hivStatus, String artNumber) {
        this.client = client;
        this.name = name;
        this.relationship = relationship;
        this.age = age;
        this.gender = gender;
        this.hivStatus = hivStatus;
        this.artNumber = artNumber;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Client getClient() { return client; }
    public void setClient(Client client) { this.client = client; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getRelationship() { return relationship; }
    public void setRelationship(String relationship) { this.relationship = relationship; }
    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public String getHivStatus() { return hivStatus; }
    public void setHivStatus(String hivStatus) { this.hivStatus = hivStatus; }
    public String getArtNumber() { return artNumber; }
    public void setArtNumber(String artNumber) { this.artNumber = artNumber; }
    public boolean isDeleted() { return deleted; }
    public void setDeleted(boolean deleted) { this.deleted = deleted; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
