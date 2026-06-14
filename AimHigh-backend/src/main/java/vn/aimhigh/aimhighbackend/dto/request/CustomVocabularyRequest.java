package vn.aimhigh.aimhighbackend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CustomVocabularyRequest {
    @NotBlank(message = "Từ vựng không được bỏ trống")
    private String word;

    private String ipa;
    private String pronunciation;
    private String partOfSpeech;
    private String meaning;
    private String viMeaning;
    private Long groupId;
    private String groupName;
    private String note;
}
