package org.allianceindia.csc2.domain;

import java.util.Set;

/**
 * Canonical Role definitions for CSC 2.0 platform.
 * Strict set: field_worker, supervisor, state_reviewer, administrator, leadership.
 */
public final class UserRole {
    public static final String FIELD_WORKER = "field_worker";
    public static final String SUPERVISOR = "supervisor";
    public static final String STATE_REVIEWER = "state_reviewer";
    public static final String ADMINISTRATOR = "administrator";
    public static final String LEADERSHIP = "leadership";

    public static final Set<String> ALL_ROLES = Set.of(
        FIELD_WORKER,
        SUPERVISOR,
        STATE_REVIEWER,
        ADMINISTRATOR,
        LEADERSHIP
    );

    private UserRole() {}

    public static boolean isValid(String role) {
        return role != null && ALL_ROLES.contains(role.toLowerCase());
    }
}
