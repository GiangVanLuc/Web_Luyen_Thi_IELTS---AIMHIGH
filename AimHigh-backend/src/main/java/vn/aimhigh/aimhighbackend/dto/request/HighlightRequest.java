package vn.aimhigh.aimhighbackend.dto.request;

import lombok.Data;
import jakarta.validation.constraints.NotNull;

@Data
public class HighlightRequest {
    @NotNull(message = "PassageId không được bỏ trống")
    private Long passageId;
    
    @NotNull(message = "StartOffset không được bỏ trống")
    private Integer startOffset;
    
    @NotNull(message = "EndOffset không được bỏ trống")
    private Integer endOffset;
    
    private String color;
    private String note;
}
