package vn.aimhigh.aimhighbackend.dto.response;

import lombok.*;
import vn.aimhigh.aimhighbackend.enums.*;

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
    private Integer totalQuestions;
}
