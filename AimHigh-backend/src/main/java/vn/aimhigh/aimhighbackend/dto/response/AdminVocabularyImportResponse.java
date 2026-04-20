package vn.aimhigh.aimhighbackend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminVocabularyImportResponse {
    private Integer totalRows;
    private Integer createdCount;
    private Integer updatedCount;
    private Integer skippedCount;

    @Builder.Default
    private List<String> errors = new ArrayList<>();
}
