package vn.aimhigh.aimhighbackend.dto.response;

import lombok.*;
import vn.aimhigh.aimhighbackend.enums.*;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamSummaryResponse {
    private Long id;
    private String title;
    private Skill skill;
    private ExamType type;
    private ExamLevel level;
    private Integer duration;
    private String description;
    private String thumbnail;
    private String status;
    private LocalDateTime createdAt;
    private Integer totalQuestions;
    private List<SectionSummaryDto> sections;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SectionSummaryDto {
        private Integer sectionNumber;
        private String label;
        private String description;
        private Integer questionFrom;
        private Integer questionTo;
    }
}
