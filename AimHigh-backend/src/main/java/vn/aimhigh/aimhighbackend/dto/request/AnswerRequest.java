package vn.aimhigh.aimhighbackend.dto.request;

import lombok.Data;
import jakarta.validation.constraints.NotNull;

@Data
public class AnswerRequest {
    @NotNull(message = "QuestionNumber không được bỏ trống")
    private Integer questionNumber;
    
    private String answerText;
    private Boolean isSkipped;
}
