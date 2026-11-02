package org.allianceindia.csc2.config;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

public class UserPrincipal implements UserDetails {
    private final UUID id;
    private final String username;
    private final String role;
    private final List<String> authorizedCenters;

    public UserPrincipal(UUID id, String username, String role, List<String> authorizedCenters) {
        this.id = id;
        this.username = username;
        this.role = role;
        this.authorizedCenters = authorizedCenters != null ? authorizedCenters : Collections.emptyList();
    }

    public UUID getId() { return id; }
    public String getRole() { return role; }
    public List<String> getAuthorizedCenters() { return authorizedCenters; }

    public boolean hasCenterAccess(String centerId) {
        if ("SYSTEM_ADMIN".equals(role)) return true;
        return authorizedCenters.contains(centerId);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }

    @Override
    public String getPassword() { return ""; }

    @Override
    public String getUsername() { return username; }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return true; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return true; }
}
