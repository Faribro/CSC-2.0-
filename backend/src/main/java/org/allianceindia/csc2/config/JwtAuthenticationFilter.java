package org.allianceindia.csc2.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final String expectedServiceCredential;

    public JwtAuthenticationFilter(JwtTokenProvider tokenProvider,
                                   @Value("${app.service.credential:local_dev_service_secret_token_abcdef123456789}") String expectedServiceCredential) {
        this.tokenProvider = tokenProvider;
        this.expectedServiceCredential = expectedServiceCredential;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        String serviceCred = request.getHeader("X-Service-Credential");
        String forwardedActorId = request.getHeader("X-Actor-ID");
        String forwardedCenter = request.getHeader("X-Center-ID");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                UserPrincipal principal = tokenProvider.parseToken(token);
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        principal, null, principal.getAuthorities()
                );
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (Exception ignored) {
                // Invalid JWT; context remains unauthenticated
            }
        } else if (serviceCred != null && serviceCred.equals(expectedServiceCredential)) {
            // Service credential flow with forwarded identity
            UUID actorId = forwardedActorId != null ? UUID.fromString(forwardedActorId) : UUID.randomUUID();
            List<String> centers = forwardedCenter != null ? List.of(forwardedCenter) : List.of("ALL");
            UserPrincipal principal = new UserPrincipal(actorId, "service-forwarded", "OUTREACH_WORKER", centers);
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    principal, null, principal.getAuthorities()
            );
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        filterChain.doFilter(request, response);
    }
}
