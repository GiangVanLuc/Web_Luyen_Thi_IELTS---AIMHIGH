package vn.aimhigh.aimhighbackend.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HighlightResponse {
    private Long id;
    private Long passageId;
    private Integer startOffset;
    private Integer endOffset;
    private String color;
    private String note;
    private LocalDateTime createdAt;
}
