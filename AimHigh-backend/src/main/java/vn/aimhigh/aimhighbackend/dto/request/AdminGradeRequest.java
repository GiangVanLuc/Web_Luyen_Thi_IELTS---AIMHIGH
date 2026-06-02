package vn.aimhigh.aimhighbackend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AdminGradeRequest {
    @NotNull(message = "Điểm số không được bỏ trống")
    @Min(value = 0, message = "Điểm số tối thiểu là 0.0")
    @Max(value = 9, message = "Điểm số tối đa là 9.0")
    private Double bandScore;
    
    private String feedback;
}
