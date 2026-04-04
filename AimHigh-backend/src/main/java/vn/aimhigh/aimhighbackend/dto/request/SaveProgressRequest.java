package vn.aimhigh.aimhighbackend.dto.request;

import lombok.Data;
import jakarta.validation.constraints.NotNull;

@Data
public class SaveProgressRequest {
    @NotNull(message = "QuestionNumber không được bỏ trống")
    private Integer questionNumber;
    
    private String answerText;
}
