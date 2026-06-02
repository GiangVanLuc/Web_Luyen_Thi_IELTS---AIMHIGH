package vn.aimhigh.aimhighbackend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardResponse {
    private long totalUsers;
    private long totalExams;
    private long pendingSubmissions;
    private long totalAttempts;
    
    private List<Integer> weeklyAttempts; // 7 phan tu, T2 -> CN
    private Map<String, Integer> skillBreakdown; // Listening, Reading, Writing, Speaking
}
