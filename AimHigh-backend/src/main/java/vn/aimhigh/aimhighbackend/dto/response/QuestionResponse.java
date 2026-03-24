package vn.aimhigh.aimhighbackend.dto.response;

import lombok.*;
import vn.aimhigh.aimhighbackend.enums.QuestionTypeName;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionResponse {
    private Long id;
    private Integer questionNumber;
    private String questionText;
    private QuestionTypeName questionType;
    private Integer audioStart;
    private Integer audioEnd;
    private Double points;
    private List<ChoiceDto> choices;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChoiceDto {
        private Long id;
        private String label;
        private String text;
    }
}
