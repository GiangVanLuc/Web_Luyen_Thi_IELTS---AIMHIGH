package vn.aimhigh.aimhighbackend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import vn.aimhigh.aimhighbackend.dto.request.AiChatRequest;
import vn.aimhigh.aimhighbackend.dto.response.AiChatResponse;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;
import vn.aimhigh.aimhighbackend.model.StudyLog;
import vn.aimhigh.aimhighbackend.model.User;
import vn.aimhigh.aimhighbackend.repository.StudyLogRepository;
import vn.aimhigh.aimhighbackend.service.UserService;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Value("${gemini.api.url}")
    private String geminiApiUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final UserService userService;
    private final StudyLogRepository studyLogRepository;

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<AiChatResponse>> chat(
            @Valid @RequestBody AiChatRequest request,
            Authentication authentication) {
        
        User currentUser = userService.requireUser(authentication);

        if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
            log.warn("GEMINI_API_KEY is missing. Mocking AI Tutor reply.");
            
            // Record mock study log
            studyLogRepository.save(StudyLog.builder()
                    .user(currentUser)
                    .activity("AI_TUTOR_CHAT")
                    .detail(request.getMessage())
                    .duration(1)
                    .createdAt(LocalDateTime.now())
                    .build());

            return ResponseEntity.ok(ApiResponse.success(AiChatResponse.builder()
                    .response("Chào bạn! Tôi là AimHigh AI Tutor. Hiện tại hệ thống chưa cấu hình Khóa API Gemini, nên tôi đang trả lời bằng chế độ ngoại tuyến. Hãy cấu hình `gemini.api.key` trong tệp thuộc tính để khởi chạy chatbot đầy đủ nhé!")
                    .build()));
        }

        StringBuilder promptBuilder = new StringBuilder();
        promptBuilder.append("You are 'AimHigh AI Tutor', a friendly, encouraging, and highly professional IELTS mentor. ")
                     .append("Your goal is to help candidates improve their English skills and prepare for the IELTS exam. ")
                     .append("Give detailed, clear answers, explain grammar rules, suggest high-band (Band 7.0-8.0+) vocabulary/collocations, ")
                     .append("and point out any mistakes in their messages by highlighting them and providing corrections in a polite way.\n")
                     .append("Please respond primarily in Vietnamese (unless the candidate explicitly requests English or wants to practice speaking/writing in English).\n\n");

        if (request.getHistory() != null && !request.getHistory().isEmpty()) {
            promptBuilder.append("Conversation History:\n");
            for (Map<String, String> turn : request.getHistory()) {
                String role = turn.getOrDefault("role", "user");
                String text = turn.getOrDefault("text", "");
                if ("user".equalsIgnoreCase(role)) {
                    promptBuilder.append("Candidate: ").append(text).append("\n");
                } else {
                    promptBuilder.append("AI Tutor: ").append(text).append("\n");
                }
            }
            promptBuilder.append("\n");
        }

        promptBuilder.append("Candidate Current Message: ").append(request.getMessage()).append("\n");
        promptBuilder.append("AI Tutor response: ");

        String url = geminiApiUrl + "?key=" + geminiApiKey;

        try {
            Map<String, Object> textPart = new HashMap<>();
            textPart.put("text", promptBuilder.toString());
            
            Map<String, Object> partMap = new HashMap<>();
            partMap.put("parts", List.of(textPart));
            
            Map<String, Object> payload = new HashMap<>();
            payload.put("contents", List.of(partMap));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

            String responseStr = restTemplate.postForObject(url, entity, String.class);

            JsonNode root = objectMapper.readTree(responseStr);
            JsonNode textNode = root.path("candidates").get(0).path("content").path("parts").get(0).path("text");
            String aiResponseText = textNode.asText("Tôi chưa hiểu câu hỏi của bạn. Bạn có thể diễn đạt lại không?");

            // Save actual study log
            studyLogRepository.save(StudyLog.builder()
                    .user(currentUser)
                    .activity("AI_TUTOR_CHAT")
                    .detail(request.getMessage())
                    .duration(1)
                    .createdAt(LocalDateTime.now())
                    .build());

            return ResponseEntity.ok(ApiResponse.success(AiChatResponse.builder()
                    .response(aiResponseText)
                    .build()));

        } catch (Exception e) {
            log.error("Error calling Gemini API for AI Chat: {}", e.getMessage());
            return ResponseEntity.ok(ApiResponse.success(AiChatResponse.builder()
                    .response("Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi của bạn. Vui lòng thử lại sau giây lát! (Chi tiết lỗi: " + e.getMessage() + ")")
                    .build()));
        }
    }
}
