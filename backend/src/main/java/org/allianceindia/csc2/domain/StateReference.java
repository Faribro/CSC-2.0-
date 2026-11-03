package org.allianceindia.csc2.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "state_reference", schema = "csc2")
public class StateReference {

    @Id
    @Column(name = "state_code", length = 10)
    private String stateCode;

    @Column(name = "state_name", nullable = false, length = 100)
    private String stateName;

    @Column(name = "iso_code", nullable = false, unique = true, length = 10)
    private String isoCode;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    public StateReference() {}

    public StateReference(String stateCode, String stateName, String isoCode) {
        this.stateCode = stateCode;
        this.stateName = stateName;
        this.isoCode = isoCode;
        this.isActive = true;
    }

    public String getStateCode() { return stateCode; }
    public void setStateCode(String stateCode) { this.stateCode = stateCode; }
    public String getStateName() { return stateName; }
    public void setStateName(String stateName) { this.stateName = stateName; }
    public String getIsoCode() { return isoCode; }
    public void setIsoCode(String isoCode) { this.isoCode = isoCode; }
    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }
}
