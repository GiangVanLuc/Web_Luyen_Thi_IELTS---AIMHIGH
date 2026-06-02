package vn.aimhigh.aimhighbackend.dto.response;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSubmissionResponse {
    private Long attemptId;
    private String studentName;
    private String examTitle;
    private String skill;
    private String status;
    private LocalDateTime submittedAt;
    private Double bandScore;
    private String feedback;
    private List<AnswerDto> answers;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnswerDto {
        private Integer questionNumber;
        private String questionText;
        private String answerText;
        private String correctAnswer;
    }
}
