package org.allianceindia.csc2;

import org.allianceindia.csc2.config.StagingSecurityValidator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("staging")
class StagingProfileSecurityTest {

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private Environment environment;

    @Test
    @DisplayName("STAGING: Dev sinks and mock controllers MUST NOT be present in application context")
    void testDevSinksAndMocksAbsentInStaging() {
        assertThat(applicationContext.containsBean("devSinkController"))
                .as("devSinkController bean must be absent in staging")
                .isFalse();

        assertThat(applicationContext.containsBean("mockGatewayController"))
                .as("mockGatewayController bean must be absent in staging")
                .isFalse();
    }

    @Test
    @DisplayName("STAGING: App refuses to start if dev sinks or mixed local profiles are detected")
    void testAppRefusesToStartWithDevSinksInStaging() {
        MockEnvironment mockEnv = new MockEnvironment();
        mockEnv.setActiveProfiles("staging", "local");

        StagingSecurityValidator validator = new StagingSecurityValidator(mockEnv, applicationContext);

        assertThatThrownBy(validator::validateProfileIntegrity)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("FATAL SECURITY VIOLATION");
    }
}
