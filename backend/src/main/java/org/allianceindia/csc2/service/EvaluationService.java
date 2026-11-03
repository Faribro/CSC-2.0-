package org.allianceindia.csc2.service;

import org.allianceindia.csc2.config.JwtTokenProvider;
import org.allianceindia.csc2.config.UserPrincipal;
import org.allianceindia.csc2.domain.*;
import org.allianceindia.csc2.dto.DTOs;
import org.allianceindia.csc2.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class EvaluationService {

    private static final Logger log = LoggerFactory.getLogger(EvaluationService.class);

    private final StateReferenceRepository stateRefRepo;
    private final FieldRosterRepository fieldRosterRepo;
    private final FieldUserRepository fieldUserRepo;
    private final LeadershipAllowlistRepository leadershipAllowlistRepo;
    private final AppUserRepository appUserRepo;
    private final PasswordCredentialRepository passwordCredRepo;
    private final OtpChallengeRepository otpChallengeRepo;
    private final ClientRepository clientRepository;
    private final TaskRepository taskRepository;
    private final CryptoService cryptoService;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final FieldUserAuthService fieldUserAuthService;
    private final SecureRandom secureRandom = new SecureRandom();

    public EvaluationService(
            StateReferenceRepository stateRefRepo,
            FieldRosterRepository fieldRosterRepo,
            FieldUserRepository fieldUserRepo,
            LeadershipAllowlistRepository leadershipAllowlistRepo,
            AppUserRepository appUserRepo,
            PasswordCredentialRepository passwordCredRepo,
            OtpChallengeRepository otpChallengeRepo,
            ClientRepository clientRepository,
            TaskRepository taskRepository,
            CryptoService cryptoService,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider tokenProvider,
            FieldUserAuthService fieldUserAuthService) {
        this.stateRefRepo = stateRefRepo;
        this.fieldRosterRepo = fieldRosterRepo;
        this.fieldUserRepo = fieldUserRepo;
        this.leadershipAllowlistRepo = leadershipAllowlistRepo;
        this.appUserRepo = appUserRepo;
        this.passwordCredRepo = passwordCredRepo;
        this.otpChallengeRepo = otpChallengeRepo;
        this.clientRepository = clientRepository;
        this.taskRepository = taskRepository;
        this.cryptoService = cryptoService;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.fieldUserAuthService = fieldUserAuthService;
    }

    public record StateTeamSignupRequest(String firstName, String lastName, String workEmail,
                                         String stateCode, String organization, String password) {}

    public record StateTeamLoginRequest(String workEmail, String password, String stateCode) {}

    public record LeadershipOtpRequest(String email) {}

    public record LeadershipVerifyRequest(String email, String otp) {}

    public record AuthResponse(String token, String role, String fullName, String state, String message) {}

    public record RosterEntryDto(UUID id, String phoneE164, String state, String district, String status, Instant createdAt) {}

    public record AddRosterRequest(String phone, String state, String district) {}

    public record BulkRosterResult(int totalProcessed, int added, int skipped, List<String> errors) {}

    public record EvaluationStats(long totalBeneficiaries, long activeCaseworkers, long openFollowUps, String state) {}

    public List<StateReference> getActiveStates() {
        return stateRefRepo.findByIsActiveTrueOrderByStateNameAsc();
    }

    /**
     * State Team Signup: validates state code (ISO 3166-2:IN), creates user, hashes password.
     */
    @Transactional
    public AuthResponse signupStateTeam(StateTeamSignupRequest req) {
        if (req.workEmail() == null || !req.workEmail().contains("@")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valid work email is required.");
        }
        if (req.password() == null || req.password().length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 8 characters.");
        }

        // Validate state code against ISO 3166-2:IN list
        StateReference stateRef = stateRefRepo.findByStateCode(req.stateCode().toUpperCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid state code: " + req.stateCode()));

        String email = req.workEmail().trim().toLowerCase();
        if (appUserRepo.findByEmailIgnoreCase(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }

        // Create AppUser
        AppUser user = new AppUser(
                email,
                email,
                req.firstName(),
                req.lastName() != null ? req.lastName() : "",
                "STATE_MANAGER",
                stateRef.getStateName()
        );
        user = appUserRepo.save(user);

        // Save password hash
        String hash = passwordEncoder.encode(req.password());
        PasswordCredential cred = new PasswordCredential(user.getId(), hash, "BCRYPT");
        passwordCredRepo.save(cred);

        List<String> centers = List.of("CENTER_" + stateRef.getStateCode(), stateRef.getStateName());
        String jwt = tokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole(), centers);
        return new AuthResponse(jwt, user.getRole(), user.getFullName(), stateRef.getStateName(), "Account created successfully.");
    }

    /**
     * State Team Login: authenticates email + password.
     */
    @Transactional
    public AuthResponse loginStateTeam(StateTeamLoginRequest req) {
        String email = req.workEmail().trim().toLowerCase();
        AppUser user = appUserRepo.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid work email or password."));

        PasswordCredential cred = passwordCredRepo.findByUserId(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid work email or password."));

        if (!passwordEncoder.matches(req.password(), cred.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid work email or password.");
        }

        List<String> centers = List.of("CENTER_" + (user.getState() != null ? user.getState() : "ALL"), user.getState() != null ? user.getState() : "ALL");
        String jwt = tokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole(), centers);
        return new AuthResponse(jwt, user.getRole(), user.getFullName(), user.getState(), "Authenticated successfully.");
    }

    /**
     * Leadership Login: Request OTP.
     * Checks against LeadershipAllowlist. Returns neutral message to prevent enumeration.
     */
    @Transactional
    public Map<String, String> requestLeadershipOtp(String email) {
        if (email == null || !email.contains("@")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valid leadership email is required.");
        }
        String cleanEmail = email.trim().toLowerCase();
        Optional<LeadershipAllowlist> leader = leadershipAllowlistRepo.findByEmailIgnoreCaseAndActiveTrue(cleanEmail);

        if (leader.isPresent()) {
            String otp = String.format("%06d", secureRandom.nextInt(1000000));
            byte[] salt = new byte[32];
            secureRandom.nextBytes(salt);
            String saltHex = HexFormat.of().formatHex(salt);
            String otpHash = cryptoService.hashOtp(otp, saltHex);

            OtpChallenge challenge = new OtpChallenge(cleanEmail, otpHash, saltHex, Instant.now().plus(10, ChronoUnit.MINUTES));
            otpChallengeRepo.save(challenge);
            log.info("[LEADERSHIP OTP] Sent OTP to {} for National Leadership Oversight: {}", cleanEmail, otp);
        } else {
            log.info("Leadership OTP requested for unlisted email {}. Returning neutral response.", cleanEmail);
        }

        return Map.of("message", "If your leadership email is registered, a 6-digit access code has been sent.");
    }

    /**
     * Leadership Login: Verify OTP.
     */
    @Transactional
    public AuthResponse verifyLeadershipOtp(String email, String otp) {
        String cleanEmail = email.trim().toLowerCase();
        LeadershipAllowlist leader = leadershipAllowlistRepo.findByEmailIgnoreCaseAndActiveTrue(cleanEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired access code."));

        Optional<OtpChallenge> challengeOpt = otpChallengeRepo.findTopByEmailIgnoreCaseAndConsumedAtIsNullOrderByCreatedAtDesc(cleanEmail);

        if (challengeOpt.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Code has expired or does not exist. Please request a new code.");
        }

        OtpChallenge challenge = challengeOpt.get();
        if (challenge.isExpired()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Code has expired. Please request a new code.");
        }
        if (challenge.getAttempts() >= 5) {
            throw new ResponseStatusException(HttpStatus.LOCKED, "Too many failed attempts. Code is locked.");
        }

        challenge.setAttempts(challenge.getAttempts() + 1);
        boolean valid = cryptoService.verifyOtp(otp, challenge.getOtpHash(), challenge.getSalt());
        if (!valid) {
            otpChallengeRepo.save(challenge);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid access code.");
        }

        challenge.setConsumedAt(Instant.now());
        otpChallengeRepo.save(challenge);

        // Create or get leadership AppUser
        AppUser user = appUserRepo.findByEmailIgnoreCase(cleanEmail).orElseGet(() -> {
            AppUser u = new AppUser(cleanEmail, cleanEmail, leader.getFullName(), "", "LEADERSHIP", "NATIONAL");
            return appUserRepo.save(u);
        });

        String jwt = tokenProvider.generateToken(user.getId(), user.getEmail(), "LEADERSHIP", List.of("ALL"));
        return new AuthResponse(jwt, "LEADERSHIP", leader.getFullName(), "NATIONAL", "Leadership access granted.");
    }

    // ROSTER MANAGEMENT
    @Transactional(readOnly = true)
    public List<RosterEntryDto> getRoster(String state) {
        List<FieldRoster> roster = (state != null && !state.isEmpty())
                ? fieldRosterRepo.findByStateOrderByCreatedAtDesc(state)
                : fieldRosterRepo.findAll();

        return roster.stream().map(r -> new RosterEntryDto(
                r.getId(), r.getPhoneE164(), r.getState(), r.getDistrict(), r.getStatus(), r.getCreatedAt()
        )).toList();
    }

    @Transactional
    public RosterEntryDto addRosterEntry(AddRosterRequest req, String addedBy) {
        String normalizedPhone = fieldUserAuthService.normalizeIndianPhone(req.phone());
        Optional<FieldRoster> existing = fieldRosterRepo.findByPhoneE164(normalizedPhone);
        if (existing.isPresent()) {
            FieldRoster r = existing.get();
            r.setStatus("ACTIVE");
            r.setState(req.state());
            r.setDistrict(req.district());
            r.setUpdatedAt(Instant.now());
            fieldRosterRepo.save(r);

            // Also activate any pending field_user
            fieldUserRepo.findByPhoneE164(normalizedPhone).ifPresent(fu -> {
                fu.setStatus("ACTIVE");
                fu.setState(req.state());
                fu.setDistrict(req.district());
                fu.setApprovedBy(addedBy);
                fu.setApprovedAt(Instant.now());
                fieldUserRepo.save(fu);
            });

            return new RosterEntryDto(r.getId(), r.getPhoneE164(), r.getState(), r.getDistrict(), r.getStatus(), r.getCreatedAt());
        }

        FieldRoster newRoster = new FieldRoster(normalizedPhone, req.state(), req.district(), addedBy);
        newRoster = fieldRosterRepo.save(newRoster);

        // Activate existing field user if any
        fieldUserRepo.findByPhoneE164(normalizedPhone).ifPresent(fu -> {
            fu.setStatus("ACTIVE");
            fu.setState(req.state());
            fu.setDistrict(req.district());
            fu.setApprovedBy(addedBy);
            fu.setApprovedAt(Instant.now());
            fieldUserRepo.save(fu);
        });

        return new RosterEntryDto(newRoster.getId(), newRoster.getPhoneE164(), newRoster.getState(), newRoster.getDistrict(), newRoster.getStatus(), newRoster.getCreatedAt());
    }

    @Transactional
    public BulkRosterResult bulkAddRoster(String csvContent, String state, String district, String addedBy) {
        int added = 0;
        int skipped = 0;
        List<String> errors = new ArrayList<>();

        String[] lines = csvContent.split("[\r\n]+");
        int total = 0;
        for (String line : lines) {
            if (line.trim().isEmpty()) continue;
            String[] parts = line.split("[,;\t]");
            String phone = parts[0].trim().replace("\"", "").replace("'", "");
            String lineDistrict = parts.length > 1 && !parts[1].trim().isEmpty() ? parts[1].trim().replace("\"", "").replace("'", "") : district;
            if (phone.isEmpty() || phone.toLowerCase().contains("phone") || phone.toLowerCase().contains("mobile")) {
                continue; // Skip header or empty
            }
            total++;
            try {
                addRosterEntry(new AddRosterRequest(phone, state, lineDistrict), addedBy);
                added++;
            } catch (Exception e) {
                skipped++;
                errors.add("Line '" + line + "': " + e.getMessage());
            }
        }
        return new BulkRosterResult(total, added, skipped, errors);
    }

    @Transactional
    public void toggleRosterStatus(UUID rosterId) {
        FieldRoster r = fieldRosterRepo.findById(rosterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Roster entry not found"));
        String newStatus = "ACTIVE".equals(r.getStatus()) ? "SUSPENDED" : "ACTIVE";
        r.setStatus(newStatus);
        r.setUpdatedAt(Instant.now());
        fieldRosterRepo.save(r);

        fieldUserRepo.findByPhoneE164(r.getPhoneE164()).ifPresent(fu -> {
            fu.setStatus(newStatus);
            fieldUserRepo.save(fu);
        });
    }

    @Transactional
    public void deleteRosterEntry(UUID rosterId) {
        fieldRosterRepo.deleteById(rosterId);
    }

    // STATE SUPERVISION & STATS
    @Transactional(readOnly = true)
    public EvaluationStats getStats(String state) {
        long totalBeneficiaries = (state != null && !state.isEmpty() && !"NATIONAL".equalsIgnoreCase(state))
                ? clientRepository.countByState(state)
                : clientRepository.count();

        long activeCaseworkers = (state != null && !state.isEmpty() && !"NATIONAL".equalsIgnoreCase(state))
                ? fieldRosterRepo.countByState(state)
                : fieldRosterRepo.count();

        long openFollowUps = taskRepository.countByStatusIn(List.of("PENDING", "DUE", "OVERDUE"));

        return new EvaluationStats(totalBeneficiaries, activeCaseworkers, openFollowUps, state != null ? state : "NATIONAL");
    }

    @Transactional(readOnly = true)
    public DTOs.ClientListResponse getEvaluationSurveys(String state, String search, int page, int size) {
        PageRequest pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Client> pageResult;

        if (state != null && !state.isEmpty() && !"NATIONAL".equalsIgnoreCase(state)) {
            if (search != null && !search.trim().isEmpty()) {
                pageResult = clientRepository.findByStateAndFullNameContainingIgnoreCase(state, search.trim(), pageable);
            } else {
                pageResult = clientRepository.findByState(state, pageable);
            }
        } else {
            pageResult = clientRepository.findAll(pageable);
        }

        List<DTOs.ClientSummaryDto> dtoList = pageResult.getContent().stream().map(c -> {
            long openTasks = taskRepository.countByClientIdAndStatusIn(c.getId(), List.of("PENDING", "DUE", "OVERDUE"));
            return new DTOs.ClientSummaryDto(
                    c.getId(),
                    c.getClientRef(),
                    c.getCenterId(),
                    c.getFullName(),
                    c.getAge(),
                    c.getGender(),
                    c.getPrimaryPhone(),
                    c.getHivStatus(),
                    c.getArtNumber(),
                    c.getStatus(),
                    c.getRegistrationDate(),
                    (int) openTasks
            );
        }).toList();

        return new DTOs.ClientListResponse(dtoList, pageResult.getTotalElements(), pageResult.getTotalPages(), page);
    }
}
