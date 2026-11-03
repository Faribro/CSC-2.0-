package org.allianceindia.csc2.service;

import org.allianceindia.csc2.config.UserPrincipal;
import org.allianceindia.csc2.domain.*;
import org.allianceindia.csc2.dto.DTOs;
import org.allianceindia.csc2.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class ClientService {

    private final ClientRepository clientRepository;
    private final ReferralRequestRepository referralRequestRepository;
    private final TaskRepository taskRepository;
    private final AuditEventRepository auditEventRepository;
    private final OutboxRepository outboxRepository;

    public ClientService(ClientRepository clientRepository,
                         ReferralRequestRepository referralRequestRepository,
                         TaskRepository taskRepository,
                         AuditEventRepository auditEventRepository,
                         OutboxRepository outboxRepository) {
        this.clientRepository = clientRepository;
        this.referralRequestRepository = referralRequestRepository;
        this.taskRepository = taskRepository;
        this.auditEventRepository = auditEventRepository;
        this.outboxRepository = outboxRepository;
    }

    @Transactional
    public DTOs.ActionReceipt registerClient(DTOs.RegisterClientRequest req, UserPrincipal user, String idempotencyKey, String ipAddress) {
        if ("PENDING_FIELD_USER".equalsIgnoreCase(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Waiting for your state team to approve your phone number before submitting surveys to server.");
        }
        if (req.fullName() == null || req.fullName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Full name is required");
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
        client.setAssignedWorkerId(user.getId());
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

        // Outbox event in same transaction
        OutboxEvent outbox = new OutboxEvent(
                "CLIENT_REGISTERED", "CLIENT", client.getId(),
                String.format("{\"clientRef\":\"%s\",\"centerId\":\"%s\",\"fullName\":\"%s\"}",
                client.getClientRef(), client.getCenterId(), client.getFullName())
        );
        outboxRepository.save(outbox);

        return new DTOs.ActionReceipt(
                idempotencyKey, "SUCCESS", "Client registered successfully. Reference: " + client.getClientRef(),
                client.getId(), client.getVersion()
        );
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
