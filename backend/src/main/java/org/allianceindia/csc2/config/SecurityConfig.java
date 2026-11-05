package org.allianceindia.csc2.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;
    private final MutationOriginFilter mutationOriginFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtFilter, MutationOriginFilter mutationOriginFilter) {
        this.jwtFilter = jwtFilter;
        this.mutationOriginFilter = mutationOriginFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .headers(headers -> headers
                .frameOptions(HeadersConfigurer.FrameOptionsConfig::deny)
                .contentTypeOptions(HeadersConfigurer.ContentTypeOptionsConfig::disable) // spring defaults or explicit
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000)
                    .requestMatcher(request -> true)
                )
                .referrerPolicy(referrer -> referrer
                    .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)
                )
                .permissionsPolicy(permissions -> permissions
                    .policy("camera=(), microphone=(), geolocation=()")
                )
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/healthz", "/actuator/health").permitAll()
                .requestMatchers("/actuator/**").hasRole("ADMIN")
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/api/v1/evaluation/states").permitAll()
                .requestMatchers("/api/v1/evaluation/state-team/**").permitAll()
                .requestMatchers("/api/v1/evaluation/leadership/**").permitAll()
                .requestMatchers("/api/v1/dev-sinks/**").permitAll()
                .requestMatchers("/api/mock/**").permitAll()
                .requestMatchers("/error").permitAll()
                .requestMatchers("/api/v1/**").authenticated()
                .anyRequest().permitAll()
            )
            .addFilterBefore(mutationOriginFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * NIST SP 800-63B / OWASP ASVS Level 2 Password Encoder:
     * Primary: Argon2id (16-byte salt, 32-byte hash, 1 parallelism, 64 MiB memory, 3 iterations)
     * Fallback: BCrypt matches for legacy hashes.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new PasswordEncoder() {
            private final Argon2PasswordEncoder argon2 = new Argon2PasswordEncoder(16, 32, 1, 65536, 3);
            private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();

            @Override
            public String encode(CharSequence rawPassword) {
                return argon2.encode(rawPassword);
            }

            @Override
            public boolean matches(CharSequence rawPassword, String encodedPassword) {
                if (encodedPassword == null) return false;
                if (encodedPassword.startsWith("$argon2")) {
                    return argon2.matches(rawPassword, encodedPassword);
                }
                if (encodedPassword.startsWith("$2a$") || encodedPassword.startsWith("$2b$") || encodedPassword.startsWith("$2y$")) {
                    return bcrypt.matches(rawPassword, encodedPassword);
                }
                return argon2.matches(rawPassword, encodedPassword);
            }

            @Override
            public boolean upgradeEncoding(String encodedPassword) {
                return encodedPassword != null && !encodedPassword.startsWith("$argon2id");
            }
        };
    }
}
