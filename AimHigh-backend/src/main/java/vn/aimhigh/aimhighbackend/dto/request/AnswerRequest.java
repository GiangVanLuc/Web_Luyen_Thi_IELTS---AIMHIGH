package vn.aimhigh.aimhighbackend.dto.request;

import lombok.Data;
import jakarta.validation.constraints.NotNull;

@Data
public class AnswerRequest {
    @NotNull(message = "QuestionId không được bỏ trống")
    private Long questionId;
    
    private String answerText;
    private Boolean isSkipped;
}
