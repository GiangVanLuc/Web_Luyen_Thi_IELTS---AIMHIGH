package vn.aimhigh.aimhighbackend.dto.response;

import lombok.*;
import vn.aimhigh.aimhighbackend.enums.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttemptResponse {
    private Long id;
    private Long examId;
    private String examTitle;
    private AttemptMode mode;
    private AttemptStatus status;
    private LocalDateTime startedAt;
    private Integer duration;
    private String feedback;
}
