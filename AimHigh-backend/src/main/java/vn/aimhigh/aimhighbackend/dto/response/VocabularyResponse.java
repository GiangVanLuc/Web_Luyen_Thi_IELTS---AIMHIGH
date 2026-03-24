package vn.aimhigh.aimhighbackend.dto.response;

import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VocabularyResponse {
    private Long id;
    private String word;
    private String ipa;
    private String partOfSpeech;
    private String meaning;
    private String viMeaning;
    private String audioUrl;
    private String imageUrl;
    private String related;
    private List<ExampleDto> examples;
    private Boolean isSaved;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExampleDto {
        private String enSentence;
        private String viSentence;
        private String source;
    }
}
