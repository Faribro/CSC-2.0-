package org.allianceindia.csc2.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.allianceindia.csc2.config.UserPrincipal;
import org.allianceindia.csc2.domain.*;
import org.allianceindia.csc2.dto.DTOs;
import org.allianceindia.csc2.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
public class ClientProfileService {

    private static final Logger log = LoggerFactory.getLogger(ClientProfileService.class);

    private final ClientRepository clientRepository;
    private final ProfileRevisionRepository profileRevisionRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final ReferralRequestRepository referralRequestRepository;
    private final AuditEventRepository auditEventRepository;
    private final OutboxRepository outboxRepository;
    private final IdempotencyReceiptRepository idempotencyReceiptRepository;
    private final CryptoService cryptoService;
    private final ObjectMapper objectMapper;

    @Autowired(required = false)
    private OutboxWorker outboxWorker;

    public ClientProfileService(
            ClientRepository clientRepository,
            ProfileRevisionRepository profileRevisionRepository,
            FamilyMemberRepository familyMemberRepository,
            ReferralRequestRepository referralRequestRepository,
            AuditEventRepository auditEventRepository,
            OutboxRepository outboxRepository,
            IdempotencyReceiptRepository idempotencyReceiptRepository,
            CryptoService cryptoService,
            ObjectMapper objectMapper) {
        this.clientRepository = clientRepository;
        this.profileRevisionRepository = profileRevisionRepository;
        this.familyMemberRepository = familyMemberRepository;
        this.referralRequestRepository = referralRequestRepository;
        this.auditEventRepository = auditEventRepository;
        this.outboxRepository = outboxRepository;
        this.idempotencyReceiptRepository = idempotencyReceiptRepository;
        this.cryptoService = cryptoService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public DTOs.ClientProfileDto getClientProfile(UUID clientId, UserPrincipal user) {
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Beneficiary record not found"));

        validateCenterScope(client, user);

        List<FamilyMember> activeMembers = familyMemberRepository.findByClientIdAndDeletedFalse(clientId);
        List<ReferralRequest> activeReferrals = referralRequestRepository.findByClientIdAndDeletedFalse(clientId);
        List<ProfileRevision> revisions = profileRevisionRepository.findByClientIdOrderByRevisionNumberDesc(clientId);

        return mapToProfileDto(client, activeMembers, activeReferrals, revisions);
    }

    @Transactional
    public DTOs.ActionReceipt updateClientProfile(
            UUID clientId,
            DTOs.UpdateProfileRequest req,
            UserPrincipal user,
            String idempotencyKey,
            String clientIp) {

        // 1. Role Authorization Gate: Leadership and State Team cannot edit!
        if ("leadership".equalsIgnoreCase(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Leadership role has aggregate-only access and cannot edit beneficiary records.");
        }
        if ("state_reviewer".equalsIgnoreCase(user.getRole()) || "state_team".equalsIgnoreCase(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "State team role has read-only evaluation access and cannot edit beneficiary records.");
        }

        // 2. Mandatory changeReason
        if (req.changeReason() == null || req.changeReason().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A non-empty changeReason is required to update a submitted profile.");
        }

        // 3. Find client & validate Center Scope: Out-of-scope center -> 404
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Beneficiary record not found"));

        validateCenterScope(client, user);

        // 4. Restricted / Immutable fields validation
        if (req.clientRef() != null && !req.clientRef().trim().equalsIgnoreCase(client.getClientRef().trim())) {
            if (!"administrator".equalsIgnoreCase(user.getRole())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Restricted field modification rejected: clientRef cannot be altered.");
            }
        }

        // 5. Idempotency Check
        String requestHash = null;
        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            requestHash = cryptoService.sha256Hex(idempotencyKey + ":" + req.changeReason() + ":" + req.fullName() + ":" + req.expectedVersion());
            Optional<IdempotencyReceipt> existingReceipt = idempotencyReceiptRepository.findByIdempotencyKey(idempotencyKey);
            if (existingReceipt.isPresent()) {
                IdempotencyReceipt receipt = existingReceipt.get();
                if (receipt.getRequestHash().equals(requestHash)) {
                    // Same-key retry: return identical result
                    return new DTOs.ActionReceipt(
                            idempotencyKey, "SUCCESS", "Profile update already processed (idempotent replay).",
                            client.getId(), client.getVersion()
                    );
                } else {
                    // Changed payload with same idempotency key -> 409 Conflict
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Idempotency key reused with conflicting payload.");
                }
            }
        }

        // 6. Optimistic Concurrency Control: Stale version -> 409 Conflict
        if (client.getVersion() != req.expectedVersion()) {
            DTOs.ClientProfileDto currentProfile = getClientProfile(clientId, user);
            String diffPreview = computeFieldDiffJson(client, req);
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Concurrent modification detected. Expected version " + req.expectedVersion() + " but current server version is " + client.getVersion()
            );
        }

        // 7. Compute Field-Level Diff
        String diffJson = computeFieldDiffJson(client, req);

        // 8. Capture Snapshot before update
        String snapshotJson = createSnapshotJson(client);

        // 9. Update Client Baseline Fields
        if (req.fullName() != null) client.setFullName(req.fullName().trim());
        if (req.aliasName() != null) client.setAliasName(req.aliasName().trim());
        if (req.age() > 0) client.setAge(req.age());
        if (req.gender() != null) client.setGender(req.gender());
        if (req.maritalStatus() != null) client.setMaritalStatus(req.maritalStatus());
        if (req.caregiverName() != null) client.setCaregiverName(req.caregiverName());
        if (req.primaryPhone() != null) client.setPrimaryPhone(req.primaryPhone());
        if (req.alternatePhone() != null) client.setAlternatePhone(req.alternatePhone());
        if (req.inSchool() != null) client.setInSchool(req.inSchool());
        if (req.occupation() != null) client.setOccupation(req.occupation());
        if (req.occupationOther() != null) client.setOccupationOther(req.occupationOther());
        if (req.keyPopulation() != null) client.setKeyPopulation(req.keyPopulation());
        if (req.addressCurrent() != null) client.setAddressCurrent(req.addressCurrent());
        if (req.district() != null) client.setDistrict(req.district());
        if (req.state() != null) client.setState(req.state());
        if (req.pincode() != null) client.setPincode(req.pincode());
        if (req.hivStatus() != null) client.setHivStatus(req.hivStatus());
        if (req.artNumber() != null) client.setArtNumber(req.artNumber());
        if (req.artCenterName() != null) client.setArtCenterName(req.artCenterName());
        if (req.artStartDate() != null) client.setArtStartDate(req.artStartDate());
        if (req.cd4Count() != null) client.setCd4Count(req.cd4Count());
        if (req.cd4Percentage() != null) client.setCd4Percentage(req.cd4Percentage());
        if (req.viralLoadCount() != null) client.setViralLoadCount(req.viralLoadCount());
        if (req.muacCm() != null) client.setMuacCm(req.muacCm());

        client.setHasHivDocDeclaration(req.hasHivDocDeclaration());
        client.setHasAddressDocDeclaration(req.hasAddressDocDeclaration());
        client.setHasArtDocDeclaration(req.hasArtDocDeclaration());
        if (req.docDeclarationNotes() != null) client.setDocDeclarationNotes(req.docDeclarationNotes());

        client.setHomeVisitConsent(req.homeVisitConsent());
        client.setMessagingConsent(req.messagingConsent());
        client.setSharingConsent(req.sharingConsent());

        // Increment version for optimistic concurrency
        int newVersion = client.getVersion() + 1;
        client.setVersion(newVersion);
        client.setUpdatedAt(Instant.now());
        client = clientRepository.save(client);

        // 10. Update Family Members (Repeats - soft-delete and add/edit)
        if (req.familyMembers() != null) {
            for (DTOs.FamilyMemberInput fInput : req.familyMembers()) {
                if (fInput.name() != null && !fInput.name().trim().isEmpty()) {
                    FamilyMember fm = new FamilyMember(
                            client,
                            fInput.name().trim(),
                            fInput.relationship() != null ? fInput.relationship() : "other",
                            fInput.age(),
                            fInput.gender(),
                            fInput.hivStatus(),
                            fInput.artNumber()
                    );
                    familyMemberRepository.save(fm);
                }
            }
        }

        // 11. Store New Profile Revision in csc2.profile_revisions
        ProfileRevision revision = new ProfileRevision(
                client,
                newVersion,
                user.getId(),
                user.getUsername(),
                req.changeReason().trim(),
                diffJson,
                snapshotJson
        );
        profileRevisionRepository.save(revision);

        // 12. Atomic Audit Log in csc2.audit_log
        AuditEvent audit = new AuditEvent(
                user.getId(), user.getUsername(), client.getCenterId(),
                "CLIENT_PROFILE_UPDATED", "CLIENT", client.getId(),
                clientIp, String.format("{\"version\":%d,\"changeReason\":\"%s\"}", newVersion, req.changeReason().replace("\"", "\\\""))
        );
        auditEventRepository.save(audit);

        // 13. Atomic Outbox Event for Sheets Mirror Sync (Complete client mirror)
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
        clientMirrorPayload.put("primaryPhone", client.getPrimaryPhone());
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
        clientMirrorPayload.put("version", newVersion);

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
            fullPayloadJson = String.format("{\"clientRef\":\"%s\",\"centerId\":\"%s\",\"fullName\":\"%s\",\"version\":%d}",
                    client.getClientRef(), client.getCenterId(), client.getFullName(), newVersion);
        }

        OutboxEvent outbox = new OutboxEvent(
                "CLIENT_UPDATED", "CLIENT", client.getId(), fullPayloadJson
        );
        outboxRepository.save(outbox);

        if (outboxWorker != null) {
            try {
                outboxWorker.processPendingOutbox();
            } catch (Exception ex) {
                log.warn("Immediate outbox dispatch to Google Sheets failed, background worker will retry: {}", ex.getMessage());
            }
        }

        // 14. Save Idempotency Receipt if key provided
        if (idempotencyKey != null && requestHash != null) {
            String receiptBody = String.format("{\"status\":\"SUCCESS\",\"version\":%d,\"resourceId\":\"%s\"}", newVersion, client.getId());
            IdempotencyReceipt receipt = new IdempotencyReceipt(
                    idempotencyKey, user.getId(), "/api/v1/clients/" + clientId + "/profile",
                    requestHash, 200, receiptBody
            );
            idempotencyReceiptRepository.save(receipt);
        }

        return new DTOs.ActionReceipt(
                idempotencyKey, "SUCCESS", "Profile updated to revision " + newVersion + " successfully.",
                client.getId(), newVersion
        );
    }

    private void validateCenterScope(Client client, UserPrincipal user) {
        if ("leadership".equalsIgnoreCase(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Leadership role has aggregate-only access and cannot view individual client records.");
        }
        if ("FIELD_USER".equalsIgnoreCase(user.getRole())) {
            boolean isCreator = client.getFieldUserId() != null && client.getFieldUserId().equals(user.getId());
            boolean inCenter = user.getAuthorizedCenters() != null &&
                    (user.getAuthorizedCenters().contains("ALL") || user.getAuthorizedCenters().contains(client.getCenterId()));
            if (!isCreator && !inCenter) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Beneficiary record not in authorized center scope.");
            }
            return;
        }
        List<String> authorized = user.getAuthorizedCenters();
        if (authorized == null || authorized.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Beneficiary record not in authorized center scope.");
        }
        if (!authorized.contains("ALL") && !authorized.contains(client.getCenterId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Beneficiary record not in authorized center scope.");
        }
    }

    private String computeFieldDiffJson(Client client, DTOs.UpdateProfileRequest req) {
        Map<String, Map<String, Object>> diff = new HashMap<>();

        if (req.fullName() != null && !req.fullName().trim().equals(client.getFullName())) {
            diff.put("fullName", Map.of("old", client.getFullName(), "new", req.fullName().trim()));
        }
        if (req.age() > 0 && req.age() != client.getAge()) {
            diff.put("age", Map.of("old", client.getAge(), "new", req.age()));
        }
        if (req.primaryPhone() != null && !req.primaryPhone().trim().equals(client.getPrimaryPhone() != null ? client.getPrimaryPhone() : "")) {
            diff.put("primaryPhone", Map.of("old", client.getPrimaryPhone() != null ? client.getPrimaryPhone() : "", "new", req.primaryPhone().trim()));
        }
        if (req.addressCurrent() != null && !req.addressCurrent().trim().equals(client.getAddressCurrent() != null ? client.getAddressCurrent() : "")) {
            diff.put("addressCurrent", Map.of("old", client.getAddressCurrent() != null ? client.getAddressCurrent() : "", "new", req.addressCurrent().trim()));
        }
        if (req.artNumber() != null && !req.artNumber().trim().equals(client.getArtNumber() != null ? client.getArtNumber() : "")) {
            diff.put("artNumber", Map.of("old", client.getArtNumber() != null ? client.getArtNumber() : "", "new", req.artNumber().trim()));
        }

        try {
            return objectMapper.writeValueAsString(diff);
        } catch (Exception e) {
            return "{}";
        }
    }

    private String createSnapshotJson(Client client) {
        try {
            Map<String, Object> map = new HashMap<>();
            map.put("clientRef", client.getClientRef());
            map.put("fullName", client.getFullName());
            map.put("age", client.getAge());
            map.put("gender", client.getGender());
            map.put("primaryPhone", client.getPrimaryPhone());
            map.put("hivStatus", client.getHivStatus());
            map.put("artNumber", client.getArtNumber());
            map.put("version", client.getVersion());
            return objectMapper.writeValueAsString(map);
        } catch (Exception e) {
            return "{}";
        }
    }

    private DTOs.ClientProfileDto mapToProfileDto(
            Client c,
            List<FamilyMember> members,
            List<ReferralRequest> referrals,
            List<ProfileRevision> revisions) {

        List<DTOs.FamilyMemberDto> memberDtos = members.stream().map(m -> new DTOs.FamilyMemberDto(
                m.getId(), m.getName(), m.getRelationship(), m.getAge(), m.getGender(), m.getHivStatus(), m.getArtNumber(), m.isDeleted()
        )).toList();

        List<DTOs.ReferralRequestDto> referralDtos = referrals.stream().map(r -> new DTOs.ReferralRequestDto(
                r.getId(), r.getReferralDate(), r.getServiceCategory(), r.getTargetFacility(), r.getReason(), r.getStatus(),
                r.getOutcomeDate(), r.getOutcomeNotes(), r.isDeleted()
        )).toList();

        List<DTOs.ProfileRevisionDto> revisionDtos = revisions.stream().map(rev -> new DTOs.ProfileRevisionDto(
                rev.getId(), rev.getRevisionNumber(), rev.getAuthorId(), rev.getAuthorName(),
                rev.getChangeReason(), rev.getDiff(), rev.getCreatedAt()
        )).toList();

        return new DTOs.ClientProfileDto(
                c.getId(), c.getClientRef(), c.getCenterId(), c.getAssignedWorkerId(), c.getRegistrationDate(),
                c.getClientType(), c.getFullName(), c.getAliasName(), c.getAge(), c.getGender(), c.getMaritalStatus(),
                c.getCaregiverName(), c.getPrimaryPhone(), c.getAlternatePhone(), c.getInSchool(), c.getOccupation(),
                c.getOccupationOther(), c.getKeyPopulation(), c.getAddressCurrent(), c.getDistrict(), c.getState(),
                c.getPincode(), c.getHivStatus(), c.getArtNumber(), c.getArtCenterName(), c.getArtStartDate(),
                c.getCd4Count(), c.getCd4Percentage(), c.getViralLoadCount(), c.getMuacCm(),
                c.isHasHivDocDeclaration(), c.isHasAddressDocDeclaration(), c.isHasArtDocDeclaration(),
                c.getDocDeclarationNotes(), c.isHomeVisitConsent(), c.isMessagingConsent(), c.isSharingConsent(),
                c.getStatus(), c.getVersion(), revisions.size(), memberDtos, referralDtos, revisionDtos
        );
    }
}
