package vn.aimhigh.aimhighbackend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class AiChatRequest {
    @NotBlank(message = "Tin nhắn không được bỏ trống")
    @Size(max = 4000, message = "Tin nhắn không được vượt quá 4000 ký tự")
    private String message;

    @Size(max = 20, message = "Lịch sử hội thoại gửi kèm không được vượt quá 20 lượt")
    private List<Map<String, String>> history;
}
