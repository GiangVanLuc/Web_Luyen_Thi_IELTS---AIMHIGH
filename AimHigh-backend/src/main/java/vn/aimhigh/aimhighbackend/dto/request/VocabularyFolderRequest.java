package vn.aimhigh.aimhighbackend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VocabularyFolderRequest {
    @NotBlank(message = "Tên thư mục không được bỏ trống")
    private String name;

    private Integer displayOrder;
}
