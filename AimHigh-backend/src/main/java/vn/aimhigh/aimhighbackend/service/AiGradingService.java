package vn.aimhigh.aimhighbackend.service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import vn.aimhigh.aimhighbackend.model.Attempt;
import vn.aimhigh.aimhighbackend.model.Question;
import vn.aimhigh.aimhighbackend.dto.request.AnswerRequest;
import vn.aimhigh.aimhighbackend.repository.QuestionRepository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiGradingService {

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Value("${gemini.api.url}")
    private String geminiApiUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final QuestionRepository questionRepository;

    public void grade(Attempt attempt, List<AnswerRequest> answers) {
        if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
            log.warn("GEMINI_API_KEY is missing. Mocking AI grading.");
            attempt.setBandScore(6.0);
            attempt.setFeedback("Vui lòng cấu hình GEMINI_API_KEY trong môi trường (.env) để AI có thể chấm điểm chi tiết.");
            return;
        }

        StringBuilder promptBuilder = new StringBuilder();
        promptBuilder.append("You are an expert IELTS examiner. Please grade the following IELTS ")
                     .append(attempt.getExam().getSkill().name())
                     .append(" submission.\n\n");

        for (AnswerRequest ansReq : answers) {
            Question q = questionRepository.findByExamIdAndQuestionNumber(attempt.getExam().getId(), ansReq.getQuestionNumber()).orElse(null);
            if (q != null) {
                promptBuilder.append("Question: ").append(q.getQuestionText()).append("\n");
                promptBuilder.append("Candidate Answer: ").append(ansReq.getAnswerText()).append("\n\n");
            }
        }

        promptBuilder.append("Provide a strict IELTS Band Score (0-9) and detailed feedback in Vietnamese. ")
                     .append("Format your response EXACTLY as a JSON object like this: ")
                     .append("{\"bandScore\": 6.5, \"feedback\": \"Your feedback here...\"}");

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

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            String responseStr = restTemplate.postForObject(url, request, String.class);

            JsonNode root = objectMapper.readTree(responseStr);
            JsonNode textNode = root.path("candidates").get(0).path("content").path("parts").get(0).path("text");
            String aiResponseText = textNode.asText();

            // Extract JSON from AI response (it might be wrapped in ```json ... ```)
            aiResponseText = aiResponseText.replaceAll("(?s).*?(\\{.*\\}).*", "$1");

            JsonNode aiJson = objectMapper.readTree(aiResponseText);
            double bandScore = aiJson.path("bandScore").asDouble(0.0);
            String feedback = aiJson.path("feedback").asText("No feedback provided.");

            attempt.setBandScore(bandScore);
            attempt.setFeedback(feedback);

        } catch (Exception e) {
            log.error("Error calling Gemini API for grading: {}", e.getMessage());
            attempt.setBandScore(0.0);
            attempt.setFeedback("Lỗi khi gọi AI chấm điểm: " + e.getMessage());
        }
    }
}
