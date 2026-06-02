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
import vn.aimhigh.aimhighbackend.enums.Skill;
import vn.aimhigh.aimhighbackend.model.Attempt;
import vn.aimhigh.aimhighbackend.model.Question;
import vn.aimhigh.aimhighbackend.dto.request.AnswerRequest;
import vn.aimhigh.aimhighbackend.repository.QuestionRepository;

import java.util.ArrayList;
import java.util.Base64;
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

    @Value("${gemini.max-inline-audio-bytes:15728640}")
    private int maxInlineAudioBytes;

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

        Skill skill = attempt.getExam().getSkill();
        StringBuilder promptBuilder = new StringBuilder();
        promptBuilder.append("You are an expert IELTS examiner. Please grade the following IELTS ")
                     .append(skill.name())
                     .append(" submission.\n\n");

        List<Map<String, Object>> parts = new ArrayList<>();
        for (AnswerRequest ansReq : answers) {
            Question q = questionRepository.findByExamIdAndQuestionNumber(attempt.getExam().getId(), ansReq.getQuestionNumber()).orElse(null);
            if (q != null) {
                promptBuilder.append("Question: ").append(q.getQuestionText()).append("\n");
                if (skill == Skill.SPEAKING && isHttpUrl(ansReq.getAnswerText())) {
                    promptBuilder.append("Candidate Answer: attached audio for question ")
                            .append(ansReq.getQuestionNumber())
                            .append(".\n\n");
                    addAudioPart(parts, ansReq.getAnswerText());
                } else {
                    promptBuilder.append("Candidate Answer: ").append(ansReq.getAnswerText()).append("\n\n");
                }
            }
        }

        if (skill == Skill.WRITING) {
            promptBuilder.append("Assess Task Response, Coherence and Cohesion, Lexical Resource, and Grammatical Range and Accuracy. ");
        } else if (skill == Skill.SPEAKING) {
            promptBuilder.append("Assess Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, and Pronunciation. ");
        }

        promptBuilder.append("Provide a strict IELTS Band Score (0-9) and detailed feedback in Vietnamese. ")
                     .append("Format your response EXACTLY as a JSON object like this: ")
                     .append("{\"bandScore\": 6.5, \"feedback\": \"Your feedback here...\"}");

        String url = geminiApiUrl + "?key=" + geminiApiKey;

        try {
            Map<String, Object> textPart = new HashMap<>();
            textPart.put("text", promptBuilder.toString());
            parts.add(0, textPart);
            
            Map<String, Object> partMap = new HashMap<>();
            partMap.put("parts", parts);
            
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

    private void addAudioPart(List<Map<String, Object>> parts, String audioUrl) {
        try {
            byte[] bytes = restTemplate.getForObject(audioUrl, byte[].class);
            if (bytes == null || bytes.length == 0) {
                parts.add(textPart("Audio URL could not be downloaded: " + audioUrl));
                return;
            }
            if (bytes.length > maxInlineAudioBytes) {
                parts.add(textPart("Audio URL is too large for inline grading: " + audioUrl));
                return;
            }

            Map<String, Object> inlineData = new HashMap<>();
            inlineData.put("mime_type", inferAudioMimeType(audioUrl));
            inlineData.put("data", Base64.getEncoder().encodeToString(bytes));

            Map<String, Object> audioPart = new HashMap<>();
            audioPart.put("inline_data", inlineData);
            parts.add(audioPart);
        } catch (Exception ex) {
            log.warn("Could not attach speaking audio for Gemini grading: {}", ex.getMessage());
            parts.add(textPart("Audio URL fallback: " + audioUrl));
        }
    }

    private Map<String, Object> textPart(String text) {
        Map<String, Object> part = new HashMap<>();
        part.put("text", text);
        return part;
    }

    private boolean isHttpUrl(String value) {
        if (value == null) {
            return false;
        }
        String normalized = value.trim().toLowerCase();
        return normalized.startsWith("http://") || normalized.startsWith("https://");
    }

    private String inferAudioMimeType(String url) {
        String normalized = url == null ? "" : url.toLowerCase();
        if (normalized.contains(".mp3")) return "audio/mpeg";
        if (normalized.contains(".wav")) return "audio/wav";
        if (normalized.contains(".ogg")) return "audio/ogg";
        if (normalized.contains(".m4a")) return "audio/mp4";
        if (normalized.contains(".aac")) return "audio/aac";
        if (normalized.contains(".flac")) return "audio/flac";
        return "audio/webm";
    }
}
