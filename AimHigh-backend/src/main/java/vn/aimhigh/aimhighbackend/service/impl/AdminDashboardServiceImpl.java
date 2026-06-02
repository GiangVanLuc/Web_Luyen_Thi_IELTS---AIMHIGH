package vn.aimhigh.aimhighbackend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import vn.aimhigh.aimhighbackend.dto.response.AdminDashboardResponse;
import vn.aimhigh.aimhighbackend.enums.AttemptStatus;
import vn.aimhigh.aimhighbackend.model.Attempt;
import vn.aimhigh.aimhighbackend.repository.AttemptRepository;
import vn.aimhigh.aimhighbackend.repository.ExamRepository;
import vn.aimhigh.aimhighbackend.repository.UserRepository;
import vn.aimhigh.aimhighbackend.service.AdminDashboardService;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminDashboardServiceImpl implements AdminDashboardService {

    private final UserRepository userRepository;
    private final ExamRepository examRepository;
    private final AttemptRepository attemptRepository;

    @Override
    public AdminDashboardResponse getDashboardStats() {
        long totalUsers = userRepository.count();
        long totalExams = examRepository.count();

        long totalAttempts = attemptRepository.count();
        
        long pendingSubmissions = attemptRepository.countByStatusIn(
            Arrays.asList(AttemptStatus.IN_PROGRESS, AttemptStatus.SUBMITTED)
        );

        // Skill Breakdown
        Map<String, Integer> skillBreakdown = new HashMap<>();
        skillBreakdown.put("LISTENING", 0);
        skillBreakdown.put("READING", 0);
        skillBreakdown.put("WRITING", 0);
        skillBreakdown.put("SPEAKING", 0);
        
        List<Object[]> rawSkillCounts = attemptRepository.countAttemptsBySkill();
        for (Object[] row : rawSkillCounts) {
            if (row[0] != null && row[1] != null) {
                String skill = row[0].toString();
                Number count = (Number) row[1];
                skillBreakdown.put(skill, count.intValue());
            }
        }

        // Weekly attempts
        List<Integer> weeklyAttempts = Arrays.asList(0, 0, 0, 0, 0, 0, 0);
        LocalDate startOfWeek = LocalDate.now().with(DayOfWeek.MONDAY);
        LocalDate endOfWeek = startOfWeek.plusDays(6);
        
        List<java.time.LocalDateTime> thisWeekAttempts = attemptRepository.findStartedAtBetween(
            startOfWeek.atStartOfDay(), 
            endOfWeek.atTime(23, 59, 59)
        );

        for (java.time.LocalDateTime startedAt : thisWeekAttempts) {
            if (startedAt != null) {
                int dayIndex = startedAt.getDayOfWeek().getValue() - 1; // 0 for Monday
                weeklyAttempts.set(dayIndex, weeklyAttempts.get(dayIndex) + 1);
            }
        }

        return AdminDashboardResponse.builder()
                .totalUsers(totalUsers)
                .totalExams(totalExams)
                .pendingSubmissions(pendingSubmissions)
                .totalAttempts(totalAttempts)
                .weeklyAttempts(weeklyAttempts)
                .skillBreakdown(skillBreakdown)
                .build();
    }
}
