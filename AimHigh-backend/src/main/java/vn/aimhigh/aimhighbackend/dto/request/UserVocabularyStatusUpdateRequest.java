package vn.aimhigh.aimhighbackend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UserVocabularyStatusUpdateRequest {
    @NotNull(message = "learnLevel không được bỏ trống")
    @Min(value = 0, message = "learnLevel phải từ 0 đến 2")
    @Max(value = 2, message = "learnLevel phải từ 0 đến 2")
    private Integer learnLevel;
}
