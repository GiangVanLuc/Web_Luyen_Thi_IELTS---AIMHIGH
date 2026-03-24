package vn.aimhigh.aimhighbackend.dto.request;

import lombok.Data;
import java.util.List;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.Valid;

@Data
public class SubmitAttemptRequest {
    @NotNull(message = "Danh sách câu trả lời không được null")
    @Valid
    private List<AnswerRequest> answers;
}
