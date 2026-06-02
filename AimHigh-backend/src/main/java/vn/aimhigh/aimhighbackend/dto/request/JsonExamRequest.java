package vn.aimhigh.aimhighbackend.dto.request;

import lombok.*;
import vn.aimhigh.aimhighbackend.enums.*;
import jakarta.validation.constraints.*;
import jakarta.validation.Valid;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JsonExamRequest {
    @NotBlank(message = "Title không được trống")
    private String title;
    
    @NotNull(message = "Skill không được null")
    private Skill skill;
    
    @NotNull(message = "Type không được null")
    private ExamType type;
    
    @NotNull(message = "Level không được null")
    private ExamLevel level;
    
    @NotNull(message = "Duration không được null")
    private Integer duration;
    
    private Long sourceId;
    
    @Valid
    private List<PassageRequest> passages;
    
    @Valid
    private List<PartRequest> parts;

    @Data
    public static class PassageRequest {
        private String title;
        private String content;
        private Integer passageOrder;
        private String imageUrl;
        @Valid
        private List<QuestionRequest> questions;
    }

    @Data
    public static class PartRequest {
        private Integer partNumber;
        private String title;
        private String audioUrl;
        private Integer audioDuration;
        private String transcript;
        @Valid
        private List<QuestionRequest> questions;
    }

    @Data
    public static class QuestionRequest {
        private Integer questionNumber;
        private String questionText;
        private QuestionTypeName questionType;
        private String correctAnswer;
        private String explanation;
        private Integer audioStart;
        private Integer audioEnd;
        @Valid
        private List<ChoiceRequest> choices;
    }

    @Data
    public static class ChoiceRequest {
        private String label;
        private String text;
        private Boolean isCorrect;
    }
}
