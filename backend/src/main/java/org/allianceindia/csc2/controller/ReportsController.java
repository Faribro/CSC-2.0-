package org.allianceindia.csc2.controller;

import org.allianceindia.csc2.config.UserPrincipal;
import org.allianceindia.csc2.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/v1/reports")
public class ReportsController {

    private final ClientRepository clientRepository;
    private final TaskRepository taskRepository;
    private final EncounterRepository encounterRepository;
    private final DeliveredServiceRepository deliveredServiceRepository;

    public ReportsController(ClientRepository clientRepository,
                             TaskRepository taskRepository,
                             EncounterRepository encounterRepository,
                             DeliveredServiceRepository deliveredServiceRepository) {
        this.clientRepository = clientRepository;
        this.taskRepository = taskRepository;
        this.encounterRepository = encounterRepository;
        this.deliveredServiceRepository = deliveredServiceRepository;
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getSummaryReport(@AuthenticationPrincipal UserPrincipal user) {
        long totalClients = clientRepository.count();
        long totalTasks = taskRepository.count();
        long totalEncounters = encounterRepository.count();
        long totalDeliveredServices = deliveredServiceRepository.count();

        List<String> centers = List.of("CENTER_DELHI_01", "CENTER_MUMBAI_01");
        LocalDate today = LocalDate.now();

        int todayTasksCount = taskRepository.findTodayTasks(centers, today).size();
        int overdueTasksCount = taskRepository.findOverdueTasks(centers, today).size();
        int upcomingTasksCount = taskRepository.findUpcomingTasks(centers, today).size();

        Map<String, Object> response = new HashMap<>();
        response.put("totalClients", totalClients);
        response.put("totalTasks", totalTasks);
        response.put("tasksDueToday", todayTasksCount);
        response.put("tasksOverdue", overdueTasksCount);
        response.put("tasksUpcoming", upcomingTasksCount);
        response.put("completedEncounters", totalEncounters);
        response.put("deliveredServices", totalDeliveredServices);

        List<Map<String, Object>> centerBreakdown = new ArrayList<>();
        for (String c : centers) {
            long clientCount = clientRepository.countByCenterIdIn(List.of(c));
            centerBreakdown.add(Map.of(
                    "centerId", c,
                    "activeClients", clientCount,
                    "centerName", c.equals("CENTER_DELHI_01") ? "LNJP Hospital CSC Delhi" : "Sir JJ Hospital CSC Mumbai"
            ));
        }
        response.put("centerBreakdown", centerBreakdown);

        return ResponseEntity.ok(response);
    }
}
