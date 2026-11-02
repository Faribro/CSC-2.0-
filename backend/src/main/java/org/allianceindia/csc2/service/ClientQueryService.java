package org.allianceindia.csc2.service;

import org.allianceindia.csc2.config.UserPrincipal;
import org.allianceindia.csc2.domain.*;
import org.allianceindia.csc2.dto.DTOs;
import org.allianceindia.csc2.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class ClientQueryService {

    private final ClientRepository clientRepository;
    private final TaskRepository taskRepository;
    private final ContactAttemptRepository contactAttemptRepository;
    private final EncounterRepository encounterRepository;
    private final PlannedServiceRepository plannedServiceRepository;
    private final DeliveredServiceRepository deliveredServiceRepository;

    public ClientQueryService(ClientRepository clientRepository,
                              TaskRepository taskRepository,
                              ContactAttemptRepository contactAttemptRepository,
                              EncounterRepository encounterRepository,
                              PlannedServiceRepository plannedServiceRepository,
                              DeliveredServiceRepository deliveredServiceRepository) {
        this.clientRepository = clientRepository;
        this.taskRepository = taskRepository;
        this.contactAttemptRepository = contactAttemptRepository;
        this.encounterRepository = encounterRepository;
        this.plannedServiceRepository = plannedServiceRepository;
        this.deliveredServiceRepository = deliveredServiceRepository;
    }

    @Transactional(readOnly = true)
    public DTOs.ClientDetailResponse getClientDetail(UUID clientId, UserPrincipal user) {
        List<String> centers = user.getAuthorizedCenters();
        if (centers == null || centers.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Client not found or outside authorized center scope");
        }

        Client client = clientRepository.findByIdAndCenterIdIn(clientId, centers)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Client not found or outside authorized center scope"));

        List<Task> tasks = taskRepository.findByClientIdOrderByDueDateAsc(client.getId());
        List<ContactAttempt> attempts = contactAttemptRepository.findByClientIdOrderByAttemptDateDescAttemptTimeDesc(client.getId());
        List<Encounter> encounters = encounterRepository.findByClientIdOrderByObservationDateDescRecordedAtDesc(client.getId());
        List<PlannedService> planned = plannedServiceRepository.findByClientIdOrderByTargetDueDateAsc(client.getId());
        List<DeliveredService> delivered = deliveredServiceRepository.findByClientIdOrderByDeliveryDateDesc(client.getId());

        List<DTOs.TaskSummary> taskDtos = tasks.stream().map(t -> new DTOs.TaskSummary(
                t.getId(), t.getTaskRef(), client.getId(), client.getClientRef(), client.getFullName(),
                t.getCenterId(), t.getTaskType(), t.getTitle(), t.getDescription(), t.getDueDate(), t.getStatus(), t.getVersion()
        )).toList();

        List<DTOs.ContactAttemptDto> attemptDtos = attempts.stream().map(a -> new DTOs.ContactAttemptDto(
                a.getId(), a.getTask().getId(), a.getAttemptDate(), a.getChannel(), a.getOutcome(), a.getNotes()
        )).toList();

        List<DTOs.EncounterDto> encounterDtos = encounters.stream().map(e -> new DTOs.EncounterDto(
                e.getId(), e.getObservationDate(), e.getRecordedAt().toString(), e.getEncounterType(),
                e.getArtAdherenceAssessment(), e.getNutritionAssessment(), e.getGeneralNotes()
        )).toList();

        List<DTOs.PlannedServiceDto> plannedDtos = planned.stream().map(p -> new DTOs.PlannedServiceDto(
                p.getId(), p.getServiceCode(), p.getServiceName(), p.getTargetDueDate(), p.getStatus(), p.getNotes(), p.getVersion()
        )).toList();

        List<DTOs.DeliveredServiceDto> deliveredDtos = delivered.stream().map(d -> new DTOs.DeliveredServiceDto(
                d.getId(), d.getPlannedService() != null ? d.getPlannedService().getId() : null,
                d.getDeliveryDate(), d.getRecordedAt().toString(), d.getServiceCode(), d.getFacilityName(), d.getNotes()
        )).toList();

        return new DTOs.ClientDetailResponse(
                client.getId(),
                client.getClientRef(),
                client.getCenterId(),
                client.getFullName(),
                client.getAge(),
                client.getGender(),
                client.getPrimaryPhone(),
                client.getHivStatus(),
                client.getArtNumber(),
                client.getAddressCurrent(),
                client.isHasHivDocDeclaration(),
                client.isHasAddressDocDeclaration(),
                client.isHasArtDocDeclaration(),
                client.getDocDeclarationNotes(),
                client.isHomeVisitConsent(),
                client.isMessagingConsent(),
                client.getVersion(),
                taskDtos,
                attemptDtos,
                encounterDtos,
                plannedDtos,
                deliveredDtos
        );
    }
}
