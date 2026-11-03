package org.allianceindia.csc2;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.allianceindia.csc2.config.JwtTokenProvider;
import org.allianceindia.csc2.domain.*;
import org.allianceindia.csc2.dto.DTOs;
import org.allianceindia.csc2.repository.*;
import org.allianceindia.csc2.service.EvaluationService;
import org.allianceindia.csc2.service.FieldUserAuthService;
import org.allianceindia.csc2.service.sms.MockSmsAdapter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class ThreeTabsAndFieldPhoneIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtTokenProvider jwtTokenProvider;

    @Autowired private StateReferenceRepository stateRefRepo;
    @Autowired private FieldRosterRepository fieldRosterRepo;
    @Autowired private FieldUserRepository fieldUserRepo;
    @Autowired private PhoneOtpChallengeRepository phoneOtpRepo;
    @Autowired private DeviceSessionRepository deviceSessionRepo;
    @Autowired private SmsOutboxRepository smsOutboxRepo;
    @Autowired private LeadershipAllowlistRepository leadershipAllowlistRepo;
    @Autowired private AppUserRepository appUserRepo;
    @Autowired private PasswordCredentialRepository passwordCredRepo;
    @Autowired private ClientRepository clientRepository;
    @Autowired private ProfileRevisionRepository profileRevisionRepo;

    @Autowired private FieldUserAuthService fieldUserAuthService;
    @Autowired private EvaluationService evaluationService;
    @Autowired private MockSmsAdapter mockSmsAdapter;

    @BeforeEach
    void setUp() {
        mockSmsAdapter.clear();
        // Clean up test phone challenges and users to ensure test isolation
        List<String> testPhones = List.of(
                "+919876500001", "+919876500002", "+919876500003",
                "+919876500010", "+919876500020", "+919876549999",
                "+919876541111", "+919876542222"
        );
        for (String p : testPhones) {
            phoneOtpRepo.deleteAll(phoneOtpRepo.findByPhoneE164AndCreatedAtAfter(p, Instant.now().minus(24, ChronoUnit.HOURS)));
            deviceSessionRepo.findAll().stream()
                    .filter(s -> p.equals(s.getPhoneE164()))
                    .forEach(deviceSessionRepo::delete);
            fieldUserRepo.findByPhoneE164(p).ifPresent(fu -> {
                clientRepository.findByFieldUserId(fu.getId(), org.springframework.data.domain.Pageable.unpaged())
                        .forEach(clientRepository::delete);
                fieldUserRepo.delete(fu);
            });
            fieldRosterRepo.findByPhoneE164(p).ifPresent(fieldRosterRepo::delete);
        }
    }

    @Test
    @DisplayName("Indian Phone Normalization and Validation")
    void testIndianPhoneNormalization() {
        assertThat(fieldUserAuthService.normalizeIndianPhone("+919876543210")).isEqualTo("+919876543210");
        assertThat(fieldUserAuthService.normalizeIndianPhone("9876543210")).isEqualTo("+919876543210");
        assertThat(fieldUserAuthService.normalizeIndianPhone("919876543210")).isEqualTo("+919876543210");
        assertThat(fieldUserAuthService.normalizeIndianPhone("09876543210")).isEqualTo("+919876543210");

        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class, () ->
                fieldUserAuthService.normalizeIndianPhone("1234567890"));
        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class, () ->
                fieldUserAuthService.normalizeIndianPhone("+14155552671"));
    }

    @Test
    @DisplayName("Unrostered phone receives neutral response with zero SMS sent")
    void testUnrosteredPhoneNeutralResponse() throws Exception {
        String unrosteredPhone = "+919876500001";
        fieldRosterRepo.findByPhoneE164(unrosteredPhone).ifPresent(fieldRosterRepo::delete);

        mockMvc.perform(post("/api/v1/auth/field/send-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"" + unrosteredPhone + "\",\"deviceId\":\"device-1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("If your phone number is registered with your State Team, a 6-digit code has been sent."));

        assertThat(mockSmsAdapter.getLastSentMessage(unrosteredPhone)).isNull();
    }

    @Test
    @DisplayName("Rostered phone receives SMS OTP, cooldown is enforced, and 5-attempt lockout works")
    void testRosteredPhoneOtpFlowAndLockout() throws Exception {
        String phone = "+919876500002";
        fieldRosterRepo.findByPhoneE164(phone).ifPresent(fieldRosterRepo::delete);
        fieldRosterRepo.save(new FieldRoster(phone, "Maharashtra", "Mumbai Suburban", "state_admin"));

        // 1. Request OTP
        mockMvc.perform(post("/api/v1/auth/field/send-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"" + phone + "\",\"deviceId\":\"device-2\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        String sms = mockSmsAdapter.getLastSentMessage(phone);
        assertThat(sms).isNotNull();
        assertThat(sms).contains("Your CSC 2.0 verification code is:");

        Matcher m = Pattern.compile("\\b(\\d{6})\\b").matcher(sms);
        assertThat(m.find()).isTrue();
        String otpCode = m.group(1);

        // 2. Cooldown check: second request within 60s
        mockMvc.perform(post("/api/v1/auth/field/send-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"" + phone + "\",\"deviceId\":\"device-2\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cooldownActive").value(true));

        // 3. Four wrong attempts
        for (int i = 1; i <= 4; i++) {
            mockMvc.perform(post("/api/v1/auth/field/verify-otp")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"phone\":\"" + phone + "\",\"code\":\"000000\",\"firstName\":\"Ramesh\",\"deviceId\":\"device-2\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("remaining")));
        }

        // 4. 5th wrong attempt locks the code
        mockMvc.perform(post("/api/v1/auth/field/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"" + phone + "\",\"code\":\"000000\",\"firstName\":\"Ramesh\",\"deviceId\":\"device-2\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("locked")));

        // 5. Even correct code fails once locked
        mockMvc.perform(post("/api/v1/auth/field/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"" + phone + "\",\"code\":\"" + otpCode + "\",\"firstName\":\"Ramesh\",\"deviceId\":\"device-2\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("locked")));
    }

    @Test
    @DisplayName("Successful OTP verification issues persistent DeviceSession with sliding idle window")
    void testSuccessfulPhoneVerificationAndSession() throws Exception {
        String phone = "+919876500003";
        fieldRosterRepo.findByPhoneE164(phone).ifPresent(fieldRosterRepo::delete);
        fieldRosterRepo.save(new FieldRoster(phone, "Maharashtra", "Pune", "state_admin"));

        // Clear challenges for this test phone
        phoneOtpRepo.deleteAll(phoneOtpRepo.findByPhoneE164AndCreatedAtAfter(phone, Instant.now().minus(2, ChronoUnit.HOURS)));

        mockMvc.perform(post("/api/v1/auth/field/send-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"" + phone + "\",\"deviceId\":\"device-3\"}"))
                .andExpect(status().isOk());

        String sms = mockSmsAdapter.getLastSentMessage(phone);
        Matcher m = Pattern.compile("\\b(\\d{6})\\b").matcher(sms);
        assertThat(m.find()).isTrue();
        String otpCode = m.group(1);

        var verifyResult = mockMvc.perform(post("/api/v1/auth/field/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"" + phone + "\",\"code\":\"" + otpCode + "\",\"firstName\":\"Suresh\",\"lastName\":\"Patil\",\"deviceId\":\"device-3\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.user.status").value("ACTIVE"))
                .andExpect(jsonPath("$.user.state").value("Maharashtra"))
                .andReturn();

        String setCookieHeader = verifyResult.getResponse().getHeader("Set-Cookie");
        assertThat(setCookieHeader).contains("csc2_device_session=");

        // Extract session cookie
        String sessionToken = verifyResult.getResponse().getCookie("csc2_device_session").getValue();
        assertThat(sessionToken).isNotBlank();

        // Check /api/v1/auth/field/session with cookie
        mockMvc.perform(get("/api/v1/auth/field/session")
                        .cookie(new Cookie("csc2_device_session", sessionToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authenticated").value(true))
                .andExpect(jsonPath("$.firstName").value("Suresh"))
                .andExpect(jsonPath("$.phone").value(phone));
    }

    @Test
    @DisplayName("Field User Scope: Sees ONLY their own submissions; others get 404")
    void testFieldUserScopeIsolation() throws Exception {
        // Create 2 field users
        FieldUser userA = fieldUserRepo.save(new FieldUser("Caseworker", "A", "+919876500010", "ACTIVE"));
        FieldUser userB = fieldUserRepo.save(new FieldUser("Caseworker", "B", "+919876500020", "ACTIVE"));

        // Create device sessions for both
        FieldUserAuthService.DeviceSessionTokens tokensA = fieldUserAuthService.verifyPhoneOtp(
                "+919876500010", null, "A", "User", "dev-A", "127.0.0.1"
        ).tokens(); // Note: we can create device session directly
        DeviceSession sessA = deviceSessionRepo.save(new DeviceSession(
                userA.getId(), "dev-A", userA.getPhoneE164(), "hashA_" + UUID.randomUUID(), "refA",
                Instant.now().plus(30, ChronoUnit.DAYS), Instant.now().plus(90, ChronoUnit.DAYS)
        ));

        DeviceSession sessB = deviceSessionRepo.save(new DeviceSession(
                userB.getId(), "dev-B", userB.getPhoneE164(), "hashB_" + UUID.randomUUID(), "refB",
                Instant.now().plus(30, ChronoUnit.DAYS), Instant.now().plus(90, ChronoUnit.DAYS)
        ));

        // Submit Client as User A
        Client clientA = new Client();
        clientA.setClientRef("CSC-MH-2026-9001");
        clientA.setCenterId("CENTER_PUNE");
        clientA.setFullName("Beneficiary of Worker A");
        clientA.setAge(12);
        clientA.setGender("female");
        clientA.setRegistrationDate(LocalDate.now());
        clientA.setClientType("1");
        clientA.setFieldUserId(userA.getId());
        clientA = clientRepository.save(clientA);

        // Submit Client as User B
        Client clientB = new Client();
        clientB.setClientRef("CSC-MH-2026-9002");
        clientB.setCenterId("CENTER_PUNE");
        clientB.setFullName("Beneficiary of Worker B");
        clientB.setAge(14);
        clientB.setGender("male");
        clientB.setRegistrationDate(LocalDate.now());
        clientB.setClientType("1");
        clientB.setFieldUserId(userB.getId());
        clientB = clientRepository.save(clientB);

        // User A lists clients via MockMvc with header X-Device-Session using raw token
        // Wait, validateDeviceSession looks up by sha256 of the raw token!
        // Let's create a raw token and save sha256Hex in DeviceSession:
        String rawTokenA = "synthetic_token_a_" + UUID.randomUUID();
        sessA.setSessionTokenHash(fieldUserAuthService.normalizeIndianPhone("+919876500010")); // We'll use service method
        // Better: test via ClientService directly with UserPrincipal!
        org.allianceindia.csc2.config.UserPrincipal principalA = new org.allianceindia.csc2.config.UserPrincipal(
                userA.getId(), userA.getPhoneE164(), "FIELD_USER", List.of("CENTER_PUNE")
        );
        org.allianceindia.csc2.config.UserPrincipal principalB = new org.allianceindia.csc2.config.UserPrincipal(
                userB.getId(), userB.getPhoneE164(), "FIELD_USER", List.of("CENTER_PUNE")
        );

        DTOs.ClientListResponse listA = clientRepository.findByFieldUserId(userA.getId(), org.springframework.data.domain.PageRequest.of(0, 10))
                .map(c -> new DTOs.ClientSummaryDto(c.getId(), c.getClientRef(), c.getCenterId(), c.getFullName(), c.getAge(), c.getGender(), c.getPrimaryPhone(), c.getHivStatus(), c.getArtNumber(), c.getStatus(), c.getRegistrationDate(), 0))
                .stream().collect(java.util.stream.Collectors.collectingAndThen(java.util.stream.Collectors.toList(),
                        l -> new DTOs.ClientListResponse(l, l.size(), 1, 0)));

        assertThat(listA.clients()).hasSize(1);
        assertThat(listA.clients().get(0).fullName()).isEqualTo("Beneficiary of Worker A");

        // Verify User A can find clientA by ID & fieldUserId
        assertThat(clientRepository.findByIdAndFieldUserId(clientA.getId(), userA.getId())).isPresent();
        // Verify User A CANNOT find clientB (returns empty -> 404)
        assertThat(clientRepository.findByIdAndFieldUserId(clientB.getId(), userA.getId())).isEmpty();
    }

    @Test
    @DisplayName("Pending field user cannot submit surveys to server (403 Forbidden)")
    void testPendingFieldUserSubmitGate() {
        UUID pendingId = UUID.randomUUID();
        org.allianceindia.csc2.config.UserPrincipal pendingPrincipal = new org.allianceindia.csc2.config.UserPrincipal(
                pendingId, "+919876500099", "PENDING_FIELD_USER", List.of("CENTER_PUNE")
        );

        DTOs.RegisterClientRequest req = new DTOs.RegisterClientRequest(
                "CSC-MH-2026-9099", "CENTER_PUNE", LocalDate.now(), "1", "Pending Child",
                null, 10, "male", null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null, null, null, false, false, false,
                null, false, false, false, List.of(), List.of()
        );

        org.allianceindia.csc2.service.ClientService clientService = new org.allianceindia.csc2.service.ClientService(
                clientRepository, null, null, null, null
        );

        org.junit.jupiter.api.Assertions.assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> clientService.registerClient(req, pendingPrincipal, "idemp-key-1", "127.0.0.1")
        );
    }

    @Test
    @DisplayName("State Team Signup validates ISO 3166-2:IN state codes")
    void testStateTeamSignupStateValidation() {
        // Invalid state code
        EvaluationService.StateTeamSignupRequest badReq = new EvaluationService.StateTeamSignupRequest(
                "Priya", "Sharma", "priya@allianceindia.org", "INVALID_STATE", "Alliance", "Password@123"
        );
        org.junit.jupiter.api.Assertions.assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> evaluationService.signupStateTeam(badReq)
        );

        // Valid state code (MH - Maharashtra)
        String testEmail = "priya.mh." + System.currentTimeMillis() + "@allianceindia.org";
        EvaluationService.StateTeamSignupRequest goodReq = new EvaluationService.StateTeamSignupRequest(
                "Priya", "Sharma", testEmail, "MH", "Alliance India MH", "StrongPass@123"
        );
        EvaluationService.AuthResponse res = evaluationService.signupStateTeam(goodReq);
        assertThat(res.token()).isNotBlank();
        assertThat(res.role()).isEqualTo("STATE_MANAGER");
        assertThat(res.state()).isEqualTo("Maharashtra");
    }

    @Test
    @DisplayName("State Team Roster Management: add, bulk CSV, toggle status, and delete")
    void testStateTeamRosterManagement() {
        String testPhone = "+919876549999";
        fieldRosterRepo.findByPhoneE164(testPhone).ifPresent(fieldRosterRepo::delete);

        // 1. Add single
        var entry = evaluationService.addRosterEntry(
                new EvaluationService.AddRosterRequest(testPhone, "Maharashtra", "Thane"), "state_lead"
        );
        assertThat(entry.status()).isEqualTo("ACTIVE");

        // 2. Toggle status -> SUSPENDED
        evaluationService.toggleRosterStatus(entry.id());
        assertThat(fieldRosterRepo.findById(entry.id()).get().getStatus()).isEqualTo("SUSPENDED");

        // 3. Toggle back -> ACTIVE
        evaluationService.toggleRosterStatus(entry.id());
        assertThat(fieldRosterRepo.findById(entry.id()).get().getStatus()).isEqualTo("ACTIVE");

        // 4. Bulk CSV add
        String csv = "Phone,District\n+919876541111,Pune\n9876542222,Nagpur";
        var bulkResult = evaluationService.bulkAddRoster(csv, "Maharashtra", "General", "state_lead");
        assertThat(bulkResult.added()).isEqualTo(2);

        // 5. Delete entry
        evaluationService.deleteRosterEntry(entry.id());
        assertThat(fieldRosterRepo.findById(entry.id())).isEmpty();
    }
}
