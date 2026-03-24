package vn.aimhigh.aimhighbackend.dto.request;

import lombok.Data;
import vn.aimhigh.aimhighbackend.enums.AttemptMode;
import jakarta.validation.constraints.NotNull;

@Data
public class StartAttemptRequest {
    @NotNull(message = "ExamId không được bỏ trống")
    private Long examId;
    
    @NotNull(message = "Mode không được bỏ trống")
    private AttemptMode mode;
}
