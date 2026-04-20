package vn.aimhigh.aimhighbackend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UserVocabularyGroupUpdateRequest {
    @NotBlank(message = "Tên nhóm mới không được để trống")
    private String name;
}
