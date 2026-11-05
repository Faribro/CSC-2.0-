package org.allianceindia.csc2.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.util.Arrays;
import java.util.List;

/**
 * Validates that dev sinks, mock controllers, and unsafe development profiles
 * are strictly disabled in staging and production environments.
 * The application fails fast and refuses to start if any dev adapter or mixed profile is detected.
 */
@Component
public class StagingSecurityValidator {

    private static final Logger log = LoggerFactory.getLogger(StagingSecurityValidator.class);

    private final Environment env;
    private final ApplicationContext ctx;

    public StagingSecurityValidator(Environment env, ApplicationContext ctx) {
        this.env = env;
        this.ctx = ctx;
    }

    @PostConstruct
    public void validateProfileIntegrity() {
        List<String> activeProfiles = Arrays.asList(env.getActiveProfiles());
        boolean isPublicEnv = activeProfiles.contains("staging") || activeProfiles.contains("prod") || activeProfiles.contains("production");

        if (isPublicEnv) {
            log.info("Running in secured public environment with active profiles: {}", activeProfiles);
            if (activeProfiles.contains("local") || activeProfiles.contains("dev") || activeProfiles.contains("test")) {
                throw new IllegalStateException("FATAL SECURITY VIOLATION: Mixed profile configuration! Cannot activate local/dev/test alongside staging or prod. Refusing to start.");
            }
            if (ctx.containsBean("devSinkController") || ctx.containsBean("mockGatewayController")) {
                throw new IllegalStateException("FATAL SECURITY VIOLATION: Dev sinks and mock adapters MUST NOT be instantiated in staging/prod profiles! Refusing to start.");
            }
            if ("true".equalsIgnoreCase(env.getProperty("app.dev-sinks.enabled")) || "true".equalsIgnoreCase(env.getProperty("app.mocks.enabled"))) {
                throw new IllegalStateException("FATAL SECURITY VIOLATION: Dev sinks/mocks explicitly enabled via configuration in staging/prod profile! Refusing to start.");
            }
        }
    }
}
