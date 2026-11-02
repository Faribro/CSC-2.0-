package org.allianceindia.csc2.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public class DTOs {

    public record LoginRequest(String username, String password) {}
    public record LoginResponse(String token, UUID actorId, String username, String fullName, String role, List<String> authorizedCenters) {}

    public record TaskSummary(
            UUID id,
            String taskRef,
            UUID clientId,
            String clientRef,
            String clientName,
            String centerId,
            String taskType,
            String title,
            String description,
            LocalDate dueDate,
            String status,
            int version
    ) {}

    public record WorklistResponse(
            LocalDate date,
            List<TaskSummary> today,
            List<TaskSummary> overdue,
            List<TaskSummary> upcoming,
            int totalToday,
            int totalOverdue,
            int totalUpcoming
    ) {}

    public record ClientDetailResponse(
            UUID id,
            String clientRef,
            String centerId,
            String fullName,
            int age,
            String gender,
            String primaryPhone,
            String hivStatus,
            String artNumber,
            String addressCurrent,
            boolean hasHivDocDeclaration,
            boolean hasAddressDocDeclaration,
            boolean hasArtDocDeclaration,
            String docDeclarationNotes,
            boolean homeVisitConsent,
            boolean messagingConsent,
            int version,
            List<TaskSummary> tasks,
            List<ContactAttemptDto> contactAttempts,
            List<EncounterDto> encounters,
            List<PlannedServiceDto> plannedServices,
            List<DeliveredServiceDto> deliveredServices
    ) {}

    public record ContactAttemptDto(
            UUID id,
            UUID taskId,
            LocalDate attemptDate,
            String channel,
            String outcome,
            String notes
    ) {}

    public record EncounterDto(
            UUID id,
            LocalDate observationDate,
            String recordedAt,
            String encounterType,
            String artAdherenceAssessment,
            String nutritionAssessment,
            String generalNotes
    ) {}

    public record PlannedServiceDto(
            UUID id,
            String serviceCode,
            String serviceName,
            LocalDate targetDueDate,
            String status,
            String notes,
            int version
    ) {}

    public record DeliveredServiceDto(
            UUID id,
            UUID plannedServiceId,
            LocalDate deliveryDate,
            String recordedAt,
            String serviceCode,
            String facilityName,
            String notes
    ) {}

    public record RecordContactAttemptRequest(
            UUID taskId,
            UUID clientId,
            LocalDate attemptDate,
            String channel, // 'PHONE', 'HOME_VISIT', 'PHYSICAL_CSC', 'WHATSAPP'
            String outcome, // 'reached', 'not_reached', 'refused'
            String notes,
            Integer expectedTaskVersion
    ) {}

    public record RecordEncounterRequest(
            UUID clientId,
            UUID taskId,
            LocalDate observationDate, // Observation date clinically occurred
            String encounterType,
            String artAdherenceAssessment,
            String nutritionAssessment,
            String generalNotes,
            Integer cd4Count,
            Integer viralLoadCount,
            String action, // Explicit action: 'COMPLETE' to close the task, or null/other to keep open
            Integer expectedTaskVersion
    ) {}

    public record RecordPlannedServiceRequest(
            UUID clientId,
            UUID taskId,
            String purposeCode, // Canonical J5 purpose code ('1'..'13')
            String serviceCategory, // Canonical J5 service category ('cc', 'pc', 'rh', etc.)
            String serviceCode, // Service code from XLSForm svc list
            String serviceName, // Canonical or admin service description
            LocalDate targetDueDate, // Manually entered due date
            String notes
    ) {}

    public record RecordDeliveredServiceRequest(
            UUID clientId,
            UUID plannedServiceId,
            UUID taskId,
            LocalDate deliveryDate,
            String serviceCode,
            String facilityName,
            String notes,
            Integer expectedPlannedServiceVersion
    ) {}

    public record ActionReceipt(
            String idempotencyKey,
            String status,
            String message,
            UUID resourceId,
            int version
    ) {}
}
