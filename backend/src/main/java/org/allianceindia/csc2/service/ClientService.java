package org.allianceindia.csc2.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.allianceindia.csc2.config.UserPrincipal;
import org.allianceindia.csc2.domain.*;
import org.allianceindia.csc2.dto.DTOs;
import org.allianceindia.csc2.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class ClientService {

    private final ClientRepository clientRepository;
    private final ReferralRequestRepository referralRequestRepository;
    private final TaskRepository taskRepository;
    private final AuditEventRepository auditEventRepository;
    private final OutboxRepository outboxRepository;
    private final ActorRepository actorRepository;
    private final IdempotencyReceiptRepository idempotencyReceiptRepository;
    private final ObjectMapper objectMapper;

    @Autowired
    public ClientService(ClientRepository clientRepository,
                         ReferralRequestRepository referralRequestRepository,
                         TaskRepository taskRepository,
                         AuditEventRepository auditEventRepository,
                         OutboxRepository outboxRepository,
                         ActorRepository actorRepository,
                         IdempotencyReceiptRepository idempotencyReceiptRepository,
                         ObjectMapper objectMapper) {
        this.clientRepository = clientRepository;
        this.referralRequestRepository = referralRequestRepository;
        this.taskRepository = taskRepository;
        this.auditEventRepository = auditEventRepository;
        this.outboxRepository = outboxRepository;
        this.actorRepository = actorRepository;
        this.idempotencyReceiptRepository = idempotencyReceiptRepository;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    public ClientService(ClientRepository clientRepository,
                         ReferralRequestRepository referralRequestRepository,
                         TaskRepository taskRepository,
                         AuditEventRepository auditEventRepository,
                         OutboxRepository outboxRepository) {
        this(clientRepository, referralRequestRepository, taskRepository, auditEventRepository, outboxRepository, null, null, new ObjectMapper());
    }

    @Transactional
    public DTOs.ActionReceipt registerClient(DTOs.RegisterClientRequest req, UserPrincipal user, String idempotencyKey, String ipAddress) {
        if ("PENDING_FIELD_USER".equalsIgnoreCase(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Waiting for your state team to approve your phone number before submitting surveys to server.");
        }
        if (req.fullName() == null || req.fullName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Full name is required");
        }

        // Check Idempotency Key
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<IdempotencyReceipt> receipt = idempotencyReceiptRepository.findByIdempotencyKey(idempotencyKey);
            if (receipt.isPresent()) {
                if (!receipt.get().getRequestHash().equals(computeHash(req))) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Idempotency key reused with different payload");
                }
                return parseReceipt(receipt.get());
            }
        }
        String centerId = (req.centerId() != null && !req.centerId().trim().isEmpty()) ? req.centerId().trim() : "CENTER_MAIN";
        if (!user.hasCenterAccess(centerId) && !user.getAuthorizedCenters().contains(centerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Unauthorized center ID: " + centerId);
        }

        // Generate clientRef if not provided
        String clientRef = req.clientRef();
        if (clientRef == null || clientRef.trim().isEmpty()) {
            String prefix = centerId.replace("CENTER_", "").substring(0, Math.min(2, centerId.length()));
            clientRef = "CSC-" + prefix + "-" + LocalDate.now().getYear() + "-" + String.format("%04d", (int)(Math.random() * 9000 + 1000));
        }

        Client client = new Client();
        client.setClientRef(clientRef);
        client.setCenterId(centerId);
        if (user.getId() != null && actorRepository.existsById(user.getId())) {
            client.setAssignedWorkerId(user.getId());
        }
        if ("FIELD_USER".equalsIgnoreCase(user.getRole())) {
            client.setFieldUserId(user.getId());
        }
        client.setRegistrationDate(req.registrationDate() != null ? req.registrationDate() : LocalDate.now());
        client.setClientType(req.clientType() != null ? req.clientType() : "1");
        client.setFullName(req.fullName().trim());
        client.setAliasName(req.aliasName());
        client.setAge(req.age());
        client.setGender(req.gender() != null ? req.gender() : "other");
        client.setMaritalStatus(req.maritalStatus());
        client.setCaregiverName(req.caregiverName());
        client.setPrimaryPhone(req.primaryPhone());
        client.setAlternatePhone(req.alternatePhone());
        client.setInSchool(req.inSchool());
        client.setOccupation(req.occupation());
        client.setOccupationOther(req.occupationOther());
        client.setKeyPopulation(req.keyPopulation());
        client.setAddressCurrent(req.addressCurrent());
        client.setDistrict(req.district());
        client.setState(req.state());
        client.setPincode(req.pincode());
        client.setHivStatus(req.hivStatus() != null ? req.hivStatus() : "unknown");
        client.setArtNumber(req.artNumber());
        client.setArtCenterName(req.artCenterName());
        client.setArtStartDate(req.artStartDate());
        client.setCd4Count(req.cd4Count());
        client.setCd4Percentage(req.cd4Percentage());
        client.setViralLoadCount(req.viralLoadCount());
        client.setMuacCm(req.muacCm());

        // Declarations
        client.setHasHivDocDeclaration(req.hasHivDocDeclaration());
        client.setHasAddressDocDeclaration(req.hasAddressDocDeclaration());
        client.setHasArtDocDeclaration(req.hasArtDocDeclaration());
        client.setDocDeclarationNotes(req.docDeclarationNotes());

        // Consents
        client.setHomeVisitConsent(req.homeVisitConsent());
        client.setMessagingConsent(req.messagingConsent());
        client.setSharingConsent(req.sharingConsent());
        client.setStatus("ACTIVE");

        // Family members (B2)
        if (req.familyMembers() != null) {
            for (DTOs.FamilyMemberInput fmInput : req.familyMembers()) {
                if (fmInput.name() != null && !fmInput.name().trim().isEmpty()) {
                    FamilyMember fm = new FamilyMember(
                            client,
                            fmInput.name().trim(),
                            fmInput.relationship() != null ? fmInput.relationship() : "other",
                            fmInput.age(),
                            fmInput.gender(),
                            fmInput.hivStatus(),
                            fmInput.artNumber()
                    );
                    client.getFamilyMembers().add(fm);
                }
            }
        }

        // Save Client & cascaded FamilyMembers
        client = clientRepository.save(client);

        // Default owner of initial follow-up = assigned worker if present
        Task initialTask = new Task(
                "TSK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                client,
                client.getAssignedWorkerId(),
                client.getCenterId(),
                "1",
                "Monthly Adherence Counselling & Follow-up",
                LocalDate.now().plusWeeks(1)
        );
        taskRepository.save(initialTask);

        // Referrals (D5)
        if (req.referralRequests() != null) {
            for (DTOs.ReferralRequestInput refInput : req.referralRequests()) {
                if (refInput.serviceCategory() != null && !refInput.serviceCategory().trim().isEmpty()) {
                    ReferralRequest ref = new ReferralRequest(
                            client,
                            user.getId(),
                            refInput.referralDate() != null ? refInput.referralDate() : LocalDate.now(),
                            refInput.serviceCategory(),
                            refInput.targetFacility() != null ? refInput.targetFacility() : "Local Agency",
                            refInput.reason()
                    );
                    referralRequestRepository.save(ref);
                }
            }
        }

        // Immutable Audit in same transaction
        AuditEvent audit = new AuditEvent(
                user.getId(), user.getUsername(), client.getCenterId(),
                "CLIENT_REGISTERED", "CLIENT", client.getId(),
                ipAddress, String.format("{\"clientRef\":\"%s\",\"name\":\"%s\",\"age\":%d,\"gender\":\"%s\"}",
                client.getClientRef(), client.getFullName(), client.getAge(), client.getGender())
        );
        auditEventRepository.save(audit);

        // Outbox event in same transaction (Complete 38-column client mirror + repeats)
        Map<String, Object> clientMirrorPayload = new HashMap<>();
        clientMirrorPayload.put("clientId", client.getId().toString());
        clientMirrorPayload.put("clientRef", client.getClientRef());
        clientMirrorPayload.put("centerId", client.getCenterId());
        clientMirrorPayload.put("fullName", client.getFullName());
        clientMirrorPayload.put("aliasName", client.getAliasName());
        clientMirrorPayload.put("age", client.getAge());
        clientMirrorPayload.put("gender", client.getGender());
        clientMirrorPayload.put("maritalStatus", client.getMaritalStatus());
        clientMirrorPayload.put("inSchool", client.getInSchool());
        clientMirrorPayload.put("occupation", client.getOccupation());
        clientMirrorPayload.put("registrationDate", client.getRegistrationDate() != null ? client.getRegistrationDate().toString() : LocalDate.now().toString());
        clientMirrorPayload.put("primaryPhone", client.getPrimaryPhone()); // Masked by Apps Script per classification
        clientMirrorPayload.put("addressCurrent", client.getAddressCurrent());
        clientMirrorPayload.put("district", client.getDistrict());
        clientMirrorPayload.put("state", client.getState());
        clientMirrorPayload.put("pincode", client.getPincode());
        clientMirrorPayload.put("caregiverName", client.getCaregiverName());
        clientMirrorPayload.put("hivStatus", client.getHivStatus());
        clientMirrorPayload.put("artNumber", client.getArtNumber());
        clientMirrorPayload.put("artCenterName", client.getArtCenterName());
        clientMirrorPayload.put("artStartDate", client.getArtStartDate() != null ? client.getArtStartDate().toString() : null);
        clientMirrorPayload.put("cd4Count", client.getCd4Count());
        clientMirrorPayload.put("cd4Percentage", client.getCd4Percentage());
        clientMirrorPayload.put("viralLoadCount", client.getViralLoadCount());
        clientMirrorPayload.put("hasHivDoc", client.isHasHivDocDeclaration());
        clientMirrorPayload.put("hasAddressDoc", client.isHasAddressDocDeclaration());
        clientMirrorPayload.put("hasArtDoc", client.isHasArtDocDeclaration());
        clientMirrorPayload.put("homeVisitConsent", client.isHomeVisitConsent());
        clientMirrorPayload.put("messagingConsent", client.isMessagingConsent());
        clientMirrorPayload.put("status", client.getStatus());

        if (req.familyMembers() != null) {
            clientMirrorPayload.put("familyMembers", req.familyMembers());
        }
        if (req.referralRequests() != null) {
            clientMirrorPayload.put("referralRequests", req.referralRequests());
        }

        String fullPayloadJson;
        try {
            fullPayloadJson = objectMapper.writeValueAsString(clientMirrorPayload);
        } catch (Exception e) {
            fullPayloadJson = String.format("{\"clientRef\":\"%s\",\"centerId\":\"%s\",\"fullName\":\"%s\"}",
                    client.getClientRef(), client.getCenterId(), client.getFullName());
        }

        OutboxEvent outbox = new OutboxEvent(
                "CLIENT_REGISTERED", "CLIENT", client.getId(), fullPayloadJson
        );
        outboxRepository.save(outbox);

        DTOs.ActionReceipt receipt = new DTOs.ActionReceipt(
                idempotencyKey, "SUCCESS", "Client registered successfully. Reference: " + client.getClientRef(),
                client.getId(), client.getVersion()
        );

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            saveReceipt(idempotencyKey, user.getId(), "/api/v1/clients", computeHash(req), 200, receipt);
        }

        return receipt;
    }

    private String computeHash(Object obj) {
        try {
            String json = objectMapper.writeValueAsString(obj);
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(json.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            return "hash-fallback-" + System.currentTimeMillis();
        }
    }

    private void saveReceipt(String key, UUID actorId, String endpoint, String hash, int status, DTOs.ActionReceipt receipt) {
        try {
            UUID safeActorId = (actorId != null && actorRepository.existsById(actorId)) ? actorId : null;
            String body = objectMapper.writeValueAsString(receipt);
            IdempotencyReceipt r = new IdempotencyReceipt(key, safeActorId, endpoint, hash, status, body);
            idempotencyReceiptRepository.save(r);
        } catch (Exception ignored) {}
    }

    public DTOs.ActionReceipt parseReceipt(IdempotencyReceipt receipt) {
        try {
            return objectMapper.readValue(receipt.getResponseBody(), DTOs.ActionReceipt.class);
        } catch (Exception e) {
            return new DTOs.ActionReceipt(receipt.getIdempotencyKey(), "SUCCESS", "Replayed idempotency receipt", null, 0);
        }
    }

    @Transactional(readOnly = true)
    public Optional<DTOs.ActionReceipt> getExistingReceipt(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) return Optional.empty();
        return idempotencyReceiptRepository.findByIdempotencyKey(idempotencyKey).map(this::parseReceipt);
    }

    @Transactional(readOnly = true)
    public DTOs.ClientListResponse listClients(UserPrincipal user, String search, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Client> pageResult;

        if ("FIELD_USER".equalsIgnoreCase(user.getRole())) {
            // A field user sees ONLY records they submitted
            if (search != null && !search.trim().isEmpty()) {
                pageResult = clientRepository.findByFieldUserIdAndFullNameContainingIgnoreCase(user.getId(), search.trim(), pageable);
            } else {
                pageResult = clientRepository.findByFieldUserId(user.getId(), pageable);
            }
        } else {
            List<String> authorizedCenters = user.getAuthorizedCenters();
            if (authorizedCenters == null || authorizedCenters.isEmpty()) {
                return new DTOs.ClientListResponse(List.of(), 0, 0, page);
            }
            if (authorizedCenters.contains("ALL")) {
                if (search != null && !search.trim().isEmpty()) {
                    pageResult = clientRepository.findByFullNameContainingIgnoreCase(search.trim(), pageable);
                } else {
                    pageResult = clientRepository.findAll(pageable);
                }
            } else {
                if (search != null && !search.trim().isEmpty()) {
                    pageResult = clientRepository.findByCenterIdInAndFullNameContainingIgnoreCase(authorizedCenters, search.trim(), pageable);
                } else {
                    pageResult = clientRepository.findByCenterIdIn(authorizedCenters, pageable);
                }
            }
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
