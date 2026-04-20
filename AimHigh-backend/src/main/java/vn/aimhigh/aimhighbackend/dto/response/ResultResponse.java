package vn.aimhigh.aimhighbackend.dto.response;

import lombok.*;
import vn.aimhigh.aimhighbackend.enums.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResultResponse {
    private Long attemptId;
    private Long examId;
    private String examTitle;
    private Skill skill;
    private AttemptMode mode;
    private Integer totalQuestions;
    private Integer totalCorrect;
    private Integer totalWrong;
    private Double score;
    private Double bandScore;
    private Integer timeSpent;
    
    private List<ResultPartResponse> parts;
    private List<ResultPassageResponse> passages;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResultPartResponse {
        private Integer sectionNumber;
        private String label;
        private Integer totalQuestions;
        private Integer correctCount;
        private List<ResultQuestionResponse> questions;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResultPassageResponse {
        private Integer passageOrder;
        private String label;
        private Integer totalQuestions;
        private Integer correctCount;
        private List<ResultQuestionResponse> questions;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResultQuestionResponse {
        private Integer questionNumber;
        private String questionText;
        private String questionType;
        private String userAnswer;
        private String correctAnswer;
        private Boolean isCorrect;
        private Boolean isSkipped;
        private String explanation;
        private Integer audioStart;
        private Integer audioEnd;
        private List<QuestionResponse.ChoiceDto> choices;
    }
}
