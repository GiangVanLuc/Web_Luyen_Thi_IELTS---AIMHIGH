package vn.aimhigh.aimhighbackend.dto.request;

import lombok.Data;
import jakarta.validation.constraints.NotNull;

@Data
public class SaveVocabularyRequest {
    @NotNull(message = "VocabId không được bỏ trống")
    private Long vocabId;

    private Long groupId;

    private String groupName;

    private String note;
}
