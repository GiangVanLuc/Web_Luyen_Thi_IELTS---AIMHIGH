package vn.aimhigh.aimhighbackend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDashboardResponse {
    private Integer totalAttempts;
    private Integer submittedAttempts;
    private Double averageBandScore;
    private Double bestBandScore;
    private LocalDateTime lastPracticedAt;
}
