package vn.aimhigh.aimhighbackend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserVocabularyBatchResultResponse {
    private Integer requested;
    private Integer success;
    private Integer skipped;
    private Integer failed;
}
