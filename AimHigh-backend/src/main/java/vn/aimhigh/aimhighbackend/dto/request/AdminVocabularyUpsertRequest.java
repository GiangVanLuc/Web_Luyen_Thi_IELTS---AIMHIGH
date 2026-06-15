package vn.aimhigh.aimhighbackend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
public class AdminVocabularyUpsertRequest {
    @NotBlank(message = "Từ vựng không được bỏ trống")
    private String word;

    private String ipa;
    private String pronunciation;
    private String partOfSpeech;
    private String meaning;
    private String viMeaning;
    private String audioUrl;
    private String imageUrl;
    private String related;

    // Gán từ vào chủ đề (Topic) của kho AimHigh Pick. Có thể null (chưa phân loại).
    private Long topicId;

    // Gán theo TÊN khi import (tự tạo nếu chưa có). topicId ưu tiên hơn nếu có.
    private String folder;
    private String topic;

    @Valid
    private List<ExampleRequest> examples;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExampleRequest {
        private String enSentence;
        private String viSentence;
        private String source;
    }
}
