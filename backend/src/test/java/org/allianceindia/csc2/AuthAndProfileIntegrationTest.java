package org.allianceindia.csc2;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.allianceindia.csc2.config.JwtTokenProvider;
import org.allianceindia.csc2.domain.*;
import org.allianceindia.csc2.dto.DTOs;
import org.allianceindia.csc2.repository.*;
import org.allianceindia.csc2.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class AuthAndProfileIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtTokenProvider jwtTokenProvider;

    @Autowired private ActorRepository actorRepository;
    @Autowired private ScopeAssignmentRepository scopeAssignmentRepository;
    @Autowired private ClientRepository clientRepository;
    @Autowired private ProfileRevisionRepository profileRevisionRepository;
    @Autowired private AuditEventRepository auditEventRepository;
    @Autowired private OutboxRepository outboxRepository;
    @Autowired private IdempotencyReceiptRepository idempotencyReceiptRepository;

    @Autowired private StateRegistrationRepository stateRegistrationRepository;
    @Autowired private StateCodeRepository stateCodeRepository;
    @Autowired private OtpChallengeRepository otpChallengeRepository;
    @Autowired private AuthRateLimitRepository authRateLimitRepository;
    @Autowired private AppUserRepository appUserRepository;
    @Autowired private FieldProfileRepository fieldProfileRepository;
    @Autowired private UserSessionRepository userSessionRepository;

    @Autowired private CryptoService cryptoService;
    @Autowired private StateManagerAuthService stateManagerAuthService;
    @Autowired private FieldUserOnboardingService fieldUserOnboardingService;
    @Autowired private SessionManagementService sessionManagementService;

    private Actor workerDelhi;
    private Actor leaderUser;
    private Client testClient;
    private String jwtWorker;
    private String jwtLeader;

    @BeforeEach
    void setUp() {
        // Clean tables
        idempotencyReceiptRepository.deleteAll();
        profileRevisionRepository.deleteAll();
        outboxRepository.deleteAll();
        auditEventRepository.deleteAll();
        userSessionRepository.deleteAll();
        fieldProfileRepository.deleteAll();
        appUserRepository.deleteAll();
        stateCodeRepository.deleteAll();
        otpChallengeRepository.deleteAll();
        stateRegistrationRepository.deleteAll();
        authRateLimitRepository.deleteAll();
        clientRepository.deleteAll();
        scopeAssignmentRepository.deleteAll();
        actorRepository.deleteAll();

        // Worker actor
        workerDelhi = new Actor("ACT-DL-01", "worker_delhi", passwordEncoder.encode("SecretPass123"), "Sunita Sharma", UserRole.FIELD_WORKER);
        actorRepository.save(workerDelhi);
        scopeAssignmentRepository.save(new ScopeAssignment(workerDelhi, "CENTER_DELHI_01", "Central Delhi", "Delhi"));

        // Leadership actor (Read-Only)
        leaderUser = new Actor("ACT-LD-01", "leader_user", passwordEncoder.encode("SecretPass123"), "Leadership Member", UserRole.LEADERSHIP);
        actorRepository.save(leaderUser);
        scopeAssignmentRepository.save(new ScopeAssignment(leaderUser, "CENTER_DELHI_01", "National", "All"));

        // Synthetic Baseline Client
        testClient = new Client();
        testClient.setClientRef("CSC-DL-1001");
        testClient.setCenterId("CENTER_DELHI_01");
        testClient.setAssignedWorkerId(workerDelhi.getId());
        testClient.setRegistrationDate(LocalDate.now().minusMonths(1));
        testClient.setClientType("2");
        testClient.setFullName("Original Beneficiary Name");
        testClient.setAge(28);
        testClient.setGender("female");
        testClient.setHivStatus("positive");
        testClient.setArtNumber("DL-LNJP-8899");
        testClient.setHomeVisitConsent(true);
        testClient.setMessagingConsent(true);
        testClient.setSharingConsent(false);
        testClient.setVersion(1);
        clientRepository.save(testClient);

        // JWT tokens
        jwtWorker = jwtTokenProvider.generateToken(workerDelhi.getId(), workerDelhi.getUsername(), workerDelhi.getRole(), List.of("CENTER_DELHI_01"));
        jwtLeader = jwtTokenProvider.generateToken(leaderUser.getId(), leaderUser.getUsername(), leaderUser.getRole(), List.of("CENTER_DELHI_01"));
    }

    // =========================================================================
    // 1. PROFILE REVISION & CONCURRENCY TESTS
    // =========================================================================

    @Test
    @DisplayName("Profile Edit: Stale version returns 409 Conflict")
    void testProfileEditWithStaleVersionReturns409Conflict() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("expectedVersion", 0); // Client is on version 1
        payload.put("changeReason", "Attempting edit with stale version");
        payload.put("fullName", "Updated Name Stale");

        mockMvc.perform(put("/api/v1/clients/" + testClient.getId() + "/profile")
                .header("Authorization", "Bearer " + jwtWorker)
                .header("Idempotency-Key", "key-stale-001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isConflict())
                .andExpect(status().reason(org.hamcrest.Matchers.containsString("Concurrent modification detected")));
    }

    @Test
    @DisplayName("Profile Edit: Successful update stores revision, diff, and increments version")
    void testProfileEditSuccessStoresRevisionAndDiff() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("expectedVersion", 1);
        payload.put("changeReason", "Updated phone and CD4 count after routine hospital encounter");
        payload.put("fullName", "Original Beneficiary Name");
        payload.put("primaryPhone", "9811002233");
        payload.put("cd4Count", 520);
        payload.put("age", 29);

        mockMvc.perform(put("/api/v1/clients/" + testClient.getId() + "/profile")
                .header("Authorization", "Bearer " + jwtWorker)
                .header("Idempotency-Key", "key-update-001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(2));

        // Verify profile revision in database
        List<ProfileRevision> revisions = profileRevisionRepository.findByClientIdOrderByRevisionNumberDesc(testClient.getId());
        assertThat(revisions).hasSize(1);
        assertThat(revisions.get(0).getRevisionNumber()).isEqualTo(2);
        assertThat(revisions.get(0).getChangeReason()).contains("hospital encounter");
        assertThat(revisions.get(0).getDiff()).contains("primaryPhone");

        // Verify outbox event created
        assertThat(outboxRepository.count()).isGreaterThanOrEqualTo(1);
    }

    @Test
    @DisplayName("Profile Edit: Same-key retry returns identical result idempotently")
    void testProfileEditSameKeyRetryReturnsIdenticalResult() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("expectedVersion", 1);
        payload.put("changeReason", "First submission");
        payload.put("fullName", "Idempotent Beneficiary");

        // First call
        mockMvc.perform(put("/api/v1/clients/" + testClient.getId() + "/profile")
                .header("Authorization", "Bearer " + jwtWorker)
                .header("Idempotency-Key", "idemp-key-repeat-01")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(2));

        // Immediate retry with identical payload and key
        mockMvc.perform(put("/api/v1/clients/" + testClient.getId() + "/profile")
                .header("Authorization", "Bearer " + jwtWorker)
                .header("Idempotency-Key", "idemp-key-repeat-01")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(2));

        // Ensure revisions table was only modified once
        List<ProfileRevision> revisions = profileRevisionRepository.findByClientIdOrderByRevisionNumberDesc(testClient.getId());
        assertThat(revisions).hasSize(1);
    }

    @Test
    @DisplayName("Profile Edit: Changed payload with same Idempotency-Key returns 409 Conflict")
    void testProfileEditChangedPayloadSameKeyReturns409() throws Exception {
        Map<String, Object> payload1 = new HashMap<>();
        payload1.put("expectedVersion", 1);
        payload1.put("changeReason", "Reason A");
        payload1.put("fullName", "Name A");

        mockMvc.perform(put("/api/v1/clients/" + testClient.getId() + "/profile")
                .header("Authorization", "Bearer " + jwtWorker)
                .header("Idempotency-Key", "key-conflict-payload")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload1)))
                .andExpect(status().isOk());

        // Changed payload with same key
        Map<String, Object> payload2 = new HashMap<>();
        payload2.put("expectedVersion", 2);
        payload2.put("changeReason", "Reason B");
        payload2.put("fullName", "Name B Changed");

        mockMvc.perform(put("/api/v1/clients/" + testClient.getId() + "/profile")
                .header("Authorization", "Bearer " + jwtWorker)
                .header("Idempotency-Key", "key-conflict-payload")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload2)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("Profile Edit: Leadership role is read-only and receives 403 Forbidden")
    void testLeadershipRoleCannotEditProfile() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("expectedVersion", 1);
        payload.put("changeReason", "Leadership attempted modification");

        mockMvc.perform(put("/api/v1/clients/" + testClient.getId() + "/profile")
                .header("Authorization", "Bearer " + jwtLeader)
                .header("Idempotency-Key", "key-lead-001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // 2. STATE MANAGER & FIELD USER ONBOARDING TESTS
    // =========================================================================

    @Test
    @DisplayName("State Manager: Signup creates state code ALN-<STATE>-XXXX-XXXX and OTP")
    void testStateManagerSignupGeneratesCodeAndOtp() {
        StateManagerAuthService.RegistrationRequest request = new StateManagerAuthService.RegistrationRequest(
                "Rajesh", "Kumar", "rajesh.manager@delhi-aids.org", "Delhi", "Delhi State AIDS Control Society"
        );

        StateManagerAuthService.RegistrationResult response = stateManagerAuthService.registerStateManager(request, "127.0.0.1");
        assertThat(response.registrationId()).isNotNull();
        assertThat(response.encryptedEnvelope()).isNotBlank();

        // Verify state code generated with unambiguous charset
        List<StateCode> codes = stateCodeRepository.findAll();
        assertThat(codes).hasSize(1);
        assertThat(codes.get(0).getState()).isEqualTo("Delhi");
        assertThat(codes.get(0).getStatus()).isEqualTo("ACTIVE");
        assertThat(codes.get(0).getMaxRedemptions()).isEqualTo(50);
        assertThat(codes.get(0).getRedemptionCount()).isEqualTo(0);
    }

    @Test
    @DisplayName("State Manager: 5 failed OTP attempts locks challenge")
    void testOtpLockoutAfter5FailedAttempts() {
        StateManagerAuthService.RegistrationRequest request = new StateManagerAuthService.RegistrationRequest(
                "Sunil", "Verma", "sunil.lockout@dsacs.org", "Delhi", "DSACS"
        );

        stateManagerAuthService.registerStateManager(request, "127.0.0.1");

        // 5 consecutive invalid OTP attempts
        for (int i = 1; i <= 5; i++) {
            try {
                stateManagerAuthService.verifyOtp(
                        new StateManagerAuthService.VerifyOtpRequest("sunil.lockout@dsacs.org", "999999", "Browser"),
                        "127.0.0.1"
                );
            } catch (Exception ignored) {}
        }

        // 6th attempt must fail with locked status
        org.springframework.web.server.ResponseStatusException ex = org.junit.jupiter.api.Assertions.assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> stateManagerAuthService.verifyOtp(
                        new StateManagerAuthService.VerifyOtpRequest("sunil.lockout@dsacs.org", "123456", "Browser"),
                        "127.0.0.1"
                )
        );
        assertThat(ex.getStatusCode().value()).isEqualTo(org.springframework.http.HttpStatus.LOCKED.value());
        assertThat(ex.getReason()).contains("locked");
    }

    @Test
    @DisplayName("State Manager: Admin GET causes no state change; only authenticated POST approves")
    void testAdminGetDoesNotMutateOnlyPostApproves() throws Exception {
        // Create registration
        StateRegistration reg = new StateRegistration();
        reg.setFirstName("Anita");
        reg.setWorkEmail("anita.coord@mahasacs.org");
        reg.setRequestedState("Maharashtra");
        reg.setOrganization("MSACS");
        reg.setStatus("PENDING_APPROVAL");
        stateRegistrationRepository.save(reg);

        // Attempting GET on approval endpoint returns 405 Method Not Allowed
        mockMvc.perform(get("/api/v1/admin/registrations/" + reg.getId() + "/approve")
                .header("Authorization", "Bearer " + jwtWorker))
                .andExpect(status().isMethodNotAllowed());

        // Registration still PENDING_APPROVAL
        StateRegistration checked = stateRegistrationRepository.findById(reg.getId()).orElseThrow();
        assertThat(checked.getStatus()).isEqualTo("PENDING_APPROVAL");
    }

    @Test
    @DisplayName("Field User: Atomic state code redemption enforces concurrency limit")
    void testConcurrentStateCodeRedemptionsEnforcesLimit() throws Exception {
        // Create an approved StateRegistration for the coordinator
        StateRegistration coordReg = new StateRegistration();
        coordReg.setFirstName("Delhi");
        coordReg.setLastName("Coordinator");
        coordReg.setWorkEmail("coord.delhi@allianceindia.org");
        coordReg.setRequestedState("Delhi");
        coordReg.setOrganization("Alliance India");
        coordReg.setStatus("APPROVED");
        coordReg.setEmailVerifiedAt(Instant.now());
        stateRegistrationRepository.save(coordReg);

        // Create state code with max 10 redemptions
        String rawCode = "ALN-DELHI-TEST-CODE";
        String verifier = cryptoService.computeStateCodeVerifier(rawCode);

        StateCode stateCode = new StateCode();
        stateCode.setState("Delhi");
        stateCode.setCodeVerifier(verifier);
        stateCode.setStateRegistration(coordReg);
        stateCode.setStatus("ACTIVE");
        stateCode.setMaxRedemptions(10);
        stateCode.setRedemptionCount(0);
        stateCode.setExpiresAt(Instant.now().plus(30, ChronoUnit.DAYS));
        stateCodeRepository.save(stateCode);

        int totalThreads = 20;
        ExecutorService executor = Executors.newFixedThreadPool(totalThreads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(totalThreads);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger rejectCount = new AtomicInteger(0);

        for (int i = 0; i < totalThreads; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    // Generate ticket
                    String ticket = cryptoService.encryptEnvelope("sub-" + index + ":worker" + index + "@test.org:Worker" + index + "::" + Instant.now().toEpochMilli());
                    FieldUserOnboardingService.CompleteOnboardingRequest req = new FieldUserOnboardingService.CompleteOnboardingRequest(
                            ticket, "Worker" + index, "", "Central Delhi", rawCode, "Device" + index
                    );

                    fieldUserOnboardingService.completeOnboarding(req, "127.0.0.1");
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    rejectCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        doneLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        // Exactly 10 must succeed, and 10 must be rejected
        assertThat(successCount.get()).isEqualTo(10);
        assertThat(rejectCount.get()).isEqualTo(10);

        StateCode updated = stateCodeRepository.findByCodeVerifier(verifier).orElseThrow();
        assertThat(updated.getRedemptionCount()).isEqualTo(10);
    }

    @Test
    @DisplayName("Session Management: Refresh token reuse revokes all user sessions")
    void testRefreshTokenReuseRevocation() {
        AppUser user = new AppUser();
        user.setUsername("reuse_test_user");
        user.setEmail("reuse.test@allianceindia.org");
        user.setFirstName("Reuse User");
        user.setLastName("");
        user.setRole("FIELD_WORKER");
        user.setState("Delhi");
        appUserRepository.save(user);

        // 1. Establish session
        SessionManagementService.SessionTokens tokens1 = sessionManagementService.createSession(user, "Device A", "127.0.0.1");

        // 2. Rotate refresh token legitimately
        SessionManagementService.SessionTokens tokens2 = sessionManagementService.rotateRefreshSession(tokens1.refreshToken(), "Device A", "127.0.0.1");
        assertThat(tokens2).isNotNull();

        // 3. Malicious reuse: attempt to refresh with old tokens1 refreshToken
        SecurityException ex = org.junit.jupiter.api.Assertions.assertThrows(
                SecurityException.class,
                () -> sessionManagementService.rotateRefreshSession(tokens1.refreshToken(), "Device A", "127.0.0.1")
        );
        assertThat(ex.getMessage()).containsIgnoringCase("reuse detected");

        // Verify active sessions for this user is 0
        List<UserSession> activeSessions = userSessionRepository.findByUserIdAndRevokedAtIsNull(user.getId());
        assertThat(activeSessions).isEmpty();
    }
}
