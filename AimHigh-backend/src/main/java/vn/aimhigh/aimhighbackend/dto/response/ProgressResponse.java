package vn.aimhigh.aimhighbackend.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProgressResponse {
    private Long questionId;
    private String answerText;
    private Boolean isSkipped;
}
