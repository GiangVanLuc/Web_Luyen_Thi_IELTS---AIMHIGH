package vn.aimhigh.aimhighbackend.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import vn.aimhigh.aimhighbackend.dto.request.AiChatRequest;
import vn.aimhigh.aimhighbackend.dto.response.AiChatMessageResponse;
import vn.aimhigh.aimhighbackend.dto.response.AiChatResponse;
import vn.aimhigh.aimhighbackend.model.AiChatMessage;
import vn.aimhigh.aimhighbackend.model.StudyLog;
import vn.aimhigh.aimhighbackend.model.User;
import vn.aimhigh.aimhighbackend.repository.AiChatMessageRepository;
import vn.aimhigh.aimhighbackend.repository.StudyLogRepository;
import vn.aimhigh.aimhighbackend.service.AiTutorService;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiTutorServiceImpl implements AiTutorService {

    private static final int MAX_CONTEXT_MESSAGES = 12;

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Value("${gemini.api.url}")
    private String geminiApiUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final AiChatMessageRepository aiChatMessageRepository;
    private final StudyLogRepository studyLogRepository;

    @Override
    @Transactional
    public AiChatResponse chat(User user, AiChatRequest request) {
        String userText = request.getMessage().trim();
        String aiText;
        boolean fallback = false;

        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            fallback = true;
            aiText = "Chào bạn! AI Tutor đã ghi nhận câu hỏi của bạn, nhưng hệ thống chưa cấu hình GEMINI_API_KEY nên chưa thể gọi Gemini. Vui lòng cấu hình khóa API để bật chế độ trả lời đầy đủ.";
        } else {
            try {
                aiText = callGemini(user, userText);
            } catch (Exception ex) {
                fallback = true;
                log.error("Error calling Gemini API for AI Tutor", ex);
                aiText = "Xin lỗi, AI Tutor đang gặp sự cố khi kết nối Gemini. Bạn vui lòng thử lại sau ít phút nhé.";
            }
        }

        AiChatMessage userMessage = saveMessage(user, "user", userText);
        AiChatMessage assistantMessage = saveMessage(user, "model", aiText);
        recordStudyLog(user, userText);

        return AiChatResponse.builder()
                .response(aiText)
                .userMessage(toResponse(userMessage))
                .assistantMessage(toResponse(assistantMessage))
                .fallback(fallback)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AiChatMessageResponse> getHistory(User user) {
        List<AiChatMessage> messages = aiChatMessageRepository.findTop30ByUserOrderByCreatedAtDesc(user);
        Collections.reverse(messages);
        return messages.stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public void clearHistory(User user) {
        aiChatMessageRepository.deleteByUser(user);
    }

    private String callGemini(User user, String currentMessage) throws Exception {
        String prompt = buildPrompt(user, currentMessage);
        String url = geminiApiUrl + "?key=" + geminiApiKey;

        Map<String, Object> textPart = new HashMap<>();
        textPart.put("text", prompt);

        Map<String, Object> content = new HashMap<>();
        content.put("parts", List.of(textPart));

        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("temperature", 0.7);
        generationConfig.put("topP", 0.9);
        generationConfig.put("maxOutputTokens", 1200);

        Map<String, Object> payload = new HashMap<>();
        payload.put("contents", List.of(content));
        payload.put("generationConfig", generationConfig);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String responseStr = restTemplate.postForObject(url, new HttpEntity<>(payload, headers), String.class);
        return extractGeminiText(responseStr);
    }

    private String buildPrompt(User user, String currentMessage) {
        List<AiChatMessage> recentMessages = new ArrayList<>(aiChatMessageRepository.findTop30ByUserOrderByCreatedAtDesc(user));
        Collections.reverse(recentMessages);

        int start = Math.max(0, recentMessages.size() - MAX_CONTEXT_MESSAGES);
        List<AiChatMessage> context = recentMessages.subList(start, recentMessages.size());

        StringBuilder prompt = new StringBuilder();
        prompt.append("You are AimHigh AI Tutor, a friendly and professional IELTS mentor for Vietnamese learners.\n")
                .append("Respond primarily in Vietnamese unless the learner asks to practise English.\n")
                .append("Give practical IELTS guidance, explain grammar clearly, suggest Band 7.0+ vocabulary/collocations, ")
                .append("and politely correct mistakes when useful.\n")
                .append("Do not invent private user data. If the question is outside IELTS or English learning, answer briefly and guide back to learning.\n\n");

        if (!context.isEmpty()) {
            prompt.append("Recent conversation:\n");
            for (AiChatMessage message : context) {
                String speaker = "user".equalsIgnoreCase(message.getRole()) ? "Learner" : "AI Tutor";
                prompt.append(speaker).append(": ").append(message.getContent()).append("\n");
            }
            prompt.append("\n");
        }

        prompt.append("Learner current message: ").append(currentMessage).append("\n");
        prompt.append("AI Tutor response:");
        return prompt.toString();
    }

    private String extractGeminiText(String responseStr) throws Exception {
        JsonNode root = objectMapper.readTree(responseStr);
        JsonNode candidates = root.path("candidates");
        if (!candidates.isArray() || candidates.isEmpty()) {
            throw new IllegalStateException("Gemini không trả về nội dung phù hợp.");
        }

        JsonNode parts = candidates.get(0).path("content").path("parts");
        if (!parts.isArray() || parts.isEmpty()) {
            throw new IllegalStateException("Gemini response thiếu phần trả lời.");
        }

        String text = parts.get(0).path("text").asText("").trim();
        if (text.isEmpty()) {
            throw new IllegalStateException("Gemini trả về nội dung rỗng.");
        }
        return text;
    }

    private AiChatMessage saveMessage(User user, String role, String content) {
        return aiChatMessageRepository.save(AiChatMessage.builder()
                .user(user)
                .role(role)
                .content(content)
                .createdAt(LocalDateTime.now())
                .build());
    }

    private void recordStudyLog(User user, String detail) {
        studyLogRepository.save(StudyLog.builder()
                .user(user)
                .activity("AI_TUTOR_CHAT")
                .detail(detail)
                .duration(1)
                .createdAt(LocalDateTime.now())
                .build());
    }

    private AiChatMessageResponse toResponse(AiChatMessage message) {
        return AiChatMessageResponse.builder()
                .id(message.getId())
                .role(message.getRole())
                .text(message.getContent())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
