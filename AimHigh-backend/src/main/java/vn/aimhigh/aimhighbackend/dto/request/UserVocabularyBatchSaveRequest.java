package vn.aimhigh.aimhighbackend.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class UserVocabularyBatchSaveRequest {
    @NotEmpty(message = "Danh sách vocabIds không được rỗng")
    private List<Long> vocabIds;

    private Long groupId;

    private String groupName;

    private String note;
}
