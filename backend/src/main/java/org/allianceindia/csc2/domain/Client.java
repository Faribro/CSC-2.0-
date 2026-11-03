package org.allianceindia.csc2.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "clients", schema = "csc2")
public class Client {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "client_ref", nullable = false, unique = true, length = 64)
    private String clientRef;

    @Column(name = "center_id", nullable = false, length = 64)
    private String centerId;

    @Column(name = "assigned_worker_id")
    private UUID assignedWorkerId;

    @Column(name = "field_user_id")
    private UUID fieldUserId;

    @Column(name = "registration_date", nullable = false)
    private LocalDate registrationDate;

    @Column(name = "client_type", nullable = false, length = 20)
    private String clientType; // '1': New, '2': Follow-up

    @Column(name = "full_name", nullable = false, length = 200)
    private String fullName;

    @Column(name = "alias_name", length = 100)
    private String aliasName;

    @Column(nullable = false)
    private int age;

    @Column(nullable = false, length = 20)
    private String gender;

    @Column(name = "marital_status", length = 20)
    private String maritalStatus;

    @Column(name = "caregiver_name", length = 200)
    private String caregiverName;

    @Column(name = "primary_phone", length = 32)
    private String primaryPhone;

    @Column(name = "alternate_phone", length = 32)
    private String alternatePhone;

    @Column(name = "in_school", length = 10)
    private String inSchool;

    @Column(length = 20)
    private String occupation;

    @Column(name = "occupation_other", columnDefinition = "TEXT")
    private String occupationOther;

    @Column(name = "key_population", length = 20)
    private String keyPopulation;

    @Column(name = "address_current", columnDefinition = "TEXT")
    private String addressCurrent;

    @Column(length = 100)
    private String district;

    @Column(length = 100)
    private String state;

    @Column(length = 20)
    private String pincode;

    @Column(name = "hiv_status", length = 20)
    private String hivStatus;

    @Column(name = "art_number", length = 100)
    private String artNumber;

    @Column(name = "art_center_name", length = 200)
    private String artCenterName;

    @Column(name = "art_start_date")
    private LocalDate artStartDate;

    @Column(name = "cd4_count")
    private Integer cd4Count;

    @Column(name = "cd4_percentage", precision = 5, scale = 2)
    private BigDecimal cd4Percentage;

    @Column(name = "viral_load_count")
    private Integer viralLoadCount;

    @Column(name = "muac_cm", precision = 4, scale = 1)
    private BigDecimal muacCm;

    // Declarations (yes/no boolean attestations, no file uploads)
    @Column(name = "has_hiv_doc_declaration", nullable = false)
    private boolean hasHivDocDeclaration = false;

    @Column(name = "has_address_doc_declaration", nullable = false)
    private boolean hasAddressDocDeclaration = false;

    @Column(name = "has_art_doc_declaration", nullable = false)
    private boolean hasArtDocDeclaration = false;

    @Column(name = "doc_declaration_notes", columnDefinition = "TEXT")
    private String docDeclarationNotes;

    // Consents
    @Column(name = "home_visit_consent", nullable = false)
    private boolean homeVisitConsent = false;

    @Column(name = "messaging_consent", nullable = false)
    private boolean messagingConsent = false;

    @Column(name = "sharing_consent", nullable = false)
    private boolean sharingConsent = false;

    @Column(nullable = false, length = 30)
    private String status = "ACTIVE";

    @Version
    @Column(nullable = false)
    private int version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @OneToMany(mappedBy = "client", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FamilyMember> familyMembers = new ArrayList<>();

    public Client() {}

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getClientRef() { return clientRef; }
    public void setClientRef(String clientRef) { this.clientRef = clientRef; }
    public String getCenterId() { return centerId; }
    public void setCenterId(String centerId) { this.centerId = centerId; }
    public UUID getAssignedWorkerId() { return assignedWorkerId; }
    public void setAssignedWorkerId(UUID assignedWorkerId) { this.assignedWorkerId = assignedWorkerId; }
    public UUID getFieldUserId() { return fieldUserId; }
    public void setFieldUserId(UUID fieldUserId) { this.fieldUserId = fieldUserId; }
    public LocalDate getRegistrationDate() { return registrationDate; }
    public void setRegistrationDate(LocalDate registrationDate) { this.registrationDate = registrationDate; }
    public String getClientType() { return clientType; }
    public void setClientType(String clientType) { this.clientType = clientType; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getAliasName() { return aliasName; }
    public void setAliasName(String aliasName) { this.aliasName = aliasName; }
    public int getAge() { return age; }
    public void setAge(int age) { this.age = age; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public String getMaritalStatus() { return maritalStatus; }
    public void setMaritalStatus(String maritalStatus) { this.maritalStatus = maritalStatus; }
    public String getCaregiverName() { return caregiverName; }
    public void setCaregiverName(String caregiverName) { this.caregiverName = caregiverName; }
    public String getPrimaryPhone() { return primaryPhone; }
    public void setPrimaryPhone(String primaryPhone) { this.primaryPhone = primaryPhone; }
    public String getAlternatePhone() { return alternatePhone; }
    public void setAlternatePhone(String alternatePhone) { this.alternatePhone = alternatePhone; }
    public String getInSchool() { return inSchool; }
    public void setInSchool(String inSchool) { this.inSchool = inSchool; }
    public String getOccupation() { return occupation; }
    public void setOccupation(String occupation) { this.occupation = occupation; }
    public String getOccupationOther() { return occupationOther; }
    public void setOccupationOther(String occupationOther) { this.occupationOther = occupationOther; }
    public String getKeyPopulation() { return keyPopulation; }
    public void setKeyPopulation(String keyPopulation) { this.keyPopulation = keyPopulation; }
    public String getAddressCurrent() { return addressCurrent; }
    public void setAddressCurrent(String addressCurrent) { this.addressCurrent = addressCurrent; }
    public String getDistrict() { return district; }
    public void setDistrict(String district) { this.district = district; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getPincode() { return pincode; }
    public void setPincode(String pincode) { this.pincode = pincode; }
    public String getHivStatus() { return hivStatus; }
    public void setHivStatus(String hivStatus) { this.hivStatus = hivStatus; }
    public String getArtNumber() { return artNumber; }
    public void setArtNumber(String artNumber) { this.artNumber = artNumber; }
    public String getArtCenterName() { return artCenterName; }
    public void setArtCenterName(String artCenterName) { this.artCenterName = artCenterName; }
    public LocalDate getArtStartDate() { return artStartDate; }
    public void setArtStartDate(LocalDate artStartDate) { this.artStartDate = artStartDate; }
    public Integer getCd4Count() { return cd4Count; }
    public void setCd4Count(Integer cd4Count) { this.cd4Count = cd4Count; }
    public BigDecimal getCd4Percentage() { return cd4Percentage; }
    public void setCd4Percentage(BigDecimal cd4Percentage) { this.cd4Percentage = cd4Percentage; }
    public Integer getViralLoadCount() { return viralLoadCount; }
    public void setViralLoadCount(Integer viralLoadCount) { this.viralLoadCount = viralLoadCount; }
    public BigDecimal getMuacCm() { return muacCm; }
    public void setMuacCm(BigDecimal muacCm) { this.muacCm = muacCm; }
    public boolean isHasHivDocDeclaration() { return hasHivDocDeclaration; }
    public void setHasHivDocDeclaration(boolean hasHivDocDeclaration) { this.hasHivDocDeclaration = hasHivDocDeclaration; }
    public boolean isHasAddressDocDeclaration() { return hasAddressDocDeclaration; }
    public void setHasAddressDocDeclaration(boolean hasAddressDocDeclaration) { this.hasAddressDocDeclaration = hasAddressDocDeclaration; }
    public boolean isHasArtDocDeclaration() { return hasArtDocDeclaration; }
    public void setHasArtDocDeclaration(boolean hasArtDocDeclaration) { this.hasArtDocDeclaration = hasArtDocDeclaration; }
    public String getDocDeclarationNotes() { return docDeclarationNotes; }
    public void setDocDeclarationNotes(String docDeclarationNotes) { this.docDeclarationNotes = docDeclarationNotes; }
    public boolean isHomeVisitConsent() { return homeVisitConsent; }
    public void setHomeVisitConsent(boolean homeVisitConsent) { this.homeVisitConsent = homeVisitConsent; }
    public boolean isMessagingConsent() { return messagingConsent; }
    public void setMessagingConsent(boolean messagingConsent) { this.messagingConsent = messagingConsent; }
    public boolean isSharingConsent() { return sharingConsent; }
    public void setSharingConsent(boolean sharingConsent) { this.sharingConsent = sharingConsent; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public List<FamilyMember> getFamilyMembers() { return familyMembers; }
    public void setFamilyMembers(List<FamilyMember> familyMembers) { this.familyMembers = familyMembers; }
}
