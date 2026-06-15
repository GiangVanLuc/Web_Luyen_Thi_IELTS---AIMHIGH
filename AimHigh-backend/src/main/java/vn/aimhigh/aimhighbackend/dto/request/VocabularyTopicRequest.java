package vn.aimhigh.aimhighbackend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class VocabularyTopicRequest {
    @NotBlank(message = "Tên chủ đề không được bỏ trống")
    private String name;

    @NotNull(message = "Chủ đề phải thuộc một thư mục")
    private Long folderId;

    private Integer displayOrder;
}
