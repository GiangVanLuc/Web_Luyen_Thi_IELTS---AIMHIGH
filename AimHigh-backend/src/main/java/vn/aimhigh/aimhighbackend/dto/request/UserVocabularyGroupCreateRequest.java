package vn.aimhigh.aimhighbackend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UserVocabularyGroupCreateRequest {
    @NotBlank(message = "Tên nhóm không được để trống")
    private String name;
}
