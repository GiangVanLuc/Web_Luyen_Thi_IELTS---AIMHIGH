package vn.aimhigh.aimhighbackend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class AiChatRequest {
    @NotBlank(message = "Tin nhắn không được bỏ trống")
    private String message;
    
    private List<Map<String, String>> history;
}
