package vn.aimhigh.aimhighbackend.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class UserVocabularyBatchDeleteRequest {
    @NotEmpty(message = "Danh sách userVocabularyIds không được rỗng")
    private List<Long> userVocabularyIds;
}
