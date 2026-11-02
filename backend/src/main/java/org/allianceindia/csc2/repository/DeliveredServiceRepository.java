package org.allianceindia.csc2.repository;

import org.allianceindia.csc2.domain.DeliveredService;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface DeliveredServiceRepository extends JpaRepository<DeliveredService, UUID> {
    List<DeliveredService> findByClientIdOrderByDeliveryDateDesc(UUID clientId);
    List<DeliveredService> findByPlannedServiceId(UUID plannedServiceId);
}
