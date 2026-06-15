package vn.aimhigh.aimhighbackend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VocabularyFolderResponse {
    private Long id;
    private String name;
    private Integer displayOrder;
    private Long wordCount;
    private List<VocabularyTopicResponse> topics;
}
