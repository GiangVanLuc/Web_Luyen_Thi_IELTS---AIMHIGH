package vn.aimhigh.aimhighbackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;
import vn.aimhigh.aimhighbackend.model.User;
import vn.aimhigh.aimhighbackend.repository.StudyLogRepository;
import vn.aimhigh.aimhighbackend.service.UserService;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/study-logs")
@RequiredArgsConstructor
public class StudyLogController {

    private final UserService userService;
    private final StudyLogRepository studyLogRepository;

    @GetMapping("/heatmap")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> getHeatmapData(
            Authentication authentication) {
        
        User currentUser = userService.requireUser(authentication);
        
        // Lấy lịch sử hoạt động 365 ngày qua (52 tuần)
        LocalDateTime startDate = LocalDateTime.now().minusDays(365);
        List<Map<String, Object>> rawData = studyLogRepository.getDailyActivityCountSince(currentUser.getId(), startDate);
        
        Map<String, Integer> heatmapMap = new HashMap<>();
        
        if (rawData != null) {
            for (Map<String, Object> row : rawData) {
                String logDate = String.valueOf(row.get("logDate"));
                Number activityCount = (Number) row.get("activityCount");
                if (logDate != null && activityCount != null) {
                    heatmapMap.put(logDate, activityCount.intValue());
                }
            }
        }
        
        return ResponseEntity.ok(ApiResponse.success(heatmapMap));
    }
}
