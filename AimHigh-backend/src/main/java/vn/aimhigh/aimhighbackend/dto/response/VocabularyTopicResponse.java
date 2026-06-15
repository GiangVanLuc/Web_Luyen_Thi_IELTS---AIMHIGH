package vn.aimhigh.aimhighbackend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VocabularyTopicResponse {
    private Long id;
    private String name;
    private Long folderId;
    private String folderName;
    private Integer displayOrder;
    private Long wordCount;
}
