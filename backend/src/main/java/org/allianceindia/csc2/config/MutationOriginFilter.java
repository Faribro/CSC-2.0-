package org.allianceindia.csc2.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URI;
import java.util.Set;

/**
 * OWASP ASVS Level 2 - Origin and CSRF Verification Filter.
 * Verifies that state-mutating requests (POST, PUT, DELETE, PATCH)
 * originate from trusted origins when invoked with browser cookies or CORS.
 */
@Component
public class MutationOriginFilter extends OncePerRequestFilter {

    private static final Set<String> MUTATING_METHODS = Set.of("POST", "PUT", "DELETE", "PATCH");

    @Value("${app.security.allowed-origins:http://localhost:3000,http://localhost:8080,http://127.0.0.1:3000,http://127.0.0.1:8080}")
    private String allowedOriginsConfig;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod().toUpperCase();

        // Only enforce on mutating API endpoints
        if (!MUTATING_METHODS.contains(method) || !path.startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Exempt dev-sinks in local dev
        if (path.startsWith("/api/v1/dev-sinks/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String origin = request.getHeader("Origin");
        String referer = request.getHeader("Referer");

        if (origin != null && !origin.trim().isEmpty()) {
            if (!isAllowedOrigin(origin.trim())) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN, "Forbidden: Untrusted Origin for mutating request.");
                return;
            }
        } else if (referer != null && !referer.trim().isEmpty()) {
            try {
                URI refererUri = URI.create(referer.trim());
                String refererOrigin = refererUri.getScheme() + "://" + refererUri.getAuthority();
                if (!isAllowedOrigin(refererOrigin)) {
                    response.sendError(HttpServletResponse.SC_FORBIDDEN, "Forbidden: Untrusted Referer for mutating request.");
                    return;
                }
            } catch (Exception e) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN, "Forbidden: Malformed Referer header.");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean isAllowedOrigin(String origin) {
        String[] allowed = allowedOriginsConfig.split(",");
        for (String a : allowed) {
            String target = a.trim();
            if (origin.equalsIgnoreCase(target)) {
                return true;
            }
            if (target.contains("*") && origin.matches(target.replace("*", ".*"))) {
                return true;
            }
        }
        return false;
    }
}
