package vn.aimhigh.aimhighbackend.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NoteResponse {
    private Long id;
    private Long questionId;
    private String content;
    private LocalDateTime createdAt;
}
