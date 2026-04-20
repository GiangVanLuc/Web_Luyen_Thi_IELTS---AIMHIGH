package vn.aimhigh.aimhighbackend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
public class UserVocabularyUpdateRequest {
    private Long groupId;

    private String note;

    @Min(value = 0, message = "learnLevel phải từ 0 đến 2")
    @Max(value = 2, message = "learnLevel phải từ 0 đến 2")
    private Integer learnLevel;
}
