package vn.aimhigh.aimhighbackend.dto.response;

import lombok.*;
import vn.aimhigh.aimhighbackend.enums.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamDetailResponse {
    private Long id;
    private String title;
    private Skill skill;
    private ExamType type;
    private ExamLevel level;
    private Integer duration;
    
    private List<PartDto> parts;
    private List<PassageDto> passages;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PartDto {
        private Long id;
        private Integer partNumber;
        private String title;
        private String audioUrl;
        private Integer audioDuration;
        private List<QuestionResponse> questions;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PassageDto {
        private Long id;
        private String title;
        private String content;
        private String imageUrl;
        private Integer passageOrder;
        private List<QuestionResponse> questions;
    }
}
