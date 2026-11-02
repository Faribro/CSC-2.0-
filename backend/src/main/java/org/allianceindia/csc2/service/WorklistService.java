package org.allianceindia.csc2.service;

import org.allianceindia.csc2.config.UserPrincipal;
import org.allianceindia.csc2.domain.Task;
import org.allianceindia.csc2.dto.DTOs;
import org.allianceindia.csc2.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

@Service
public class WorklistService {

    private final TaskRepository taskRepository;

    public WorklistService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    @Transactional(readOnly = true)
    public DTOs.WorklistResponse getWorklist(UserPrincipal user, LocalDate targetDate) {
        LocalDate date = (targetDate != null) ? targetDate : LocalDate.now();
        List<String> centers = user.getAuthorizedCenters();

        if (centers == null || centers.isEmpty()) {
            return new DTOs.WorklistResponse(date, Collections.emptyList(), Collections.emptyList(), Collections.emptyList(), 0, 0, 0);
        }

        List<Task> todayTasks = taskRepository.findTodayTasks(centers, date);
        List<Task> overdueTasks = taskRepository.findOverdueTasks(centers, date);
        List<Task> upcomingTasks = taskRepository.findUpcomingTasks(centers, date);

        List<DTOs.TaskSummary> todaySummaries = todayTasks.stream().map(this::toSummary).toList();
        List<DTOs.TaskSummary> overdueSummaries = overdueTasks.stream().map(this::toSummary).toList();
        List<DTOs.TaskSummary> upcomingSummaries = upcomingTasks.stream().map(this::toSummary).toList();

        return new DTOs.WorklistResponse(
                date,
                todaySummaries,
                overdueSummaries,
                upcomingSummaries,
                todaySummaries.size(),
                overdueSummaries.size(),
                upcomingSummaries.size()
        );
    }

    private DTOs.TaskSummary toSummary(Task t) {
        return new DTOs.TaskSummary(
                t.getId(),
                t.getTaskRef(),
                t.getClient().getId(),
                t.getClient().getClientRef(),
                t.getClient().getFullName(),
                t.getCenterId(),
                t.getTaskType(),
                t.getTitle(),
                t.getDescription(),
                t.getDueDate(),
                t.getStatus(),
                t.getVersion()
        );
    }
}
