package vn.aimhigh.aimhighbackend.dto.request;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Data
public class NoteRequest {
    @NotNull(message = "QuestionId không được bỏ trống")
    private Long questionId;
    
    @NotBlank(message = "Content không được bỏ trống")
    private String content;
}
