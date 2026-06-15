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
        Skill skill = attempt.getExam().getSkill();

        if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
            log.warn("GEMINI_API_KEY is missing. Mocking AI grading.");
            attempt.setBandScore(6.0);
            attempt.setFeedback(buildFallbackFeedbackJson(skill,
                    "Vui lòng cấu hình GEMINI_API_KEY trong môi trường (.env) để AI có thể chấm điểm chi tiết."));
            return;
        }

        StringBuilder promptBuilder = new StringBuilder();
        List<Map<String, Object>> parts = new ArrayList<>();
        appendSubmission(promptBuilder, parts, attempt, answers, skill);
        appendGradingInstructions(promptBuilder, skill);

        String url = geminiApiUrl + "?key=" + geminiApiKey;

        try {
            Map<String, Object> textPart = new HashMap<>();
            textPart.put("text", promptBuilder.toString());
            parts.add(0, textPart);

            Map<String, Object> partMap = new HashMap<>();
            partMap.put("parts", parts);

            Map<String, Object> generationConfig = new HashMap<>();
            generationConfig.put("temperature", 0.3);
            generationConfig.put("response_mime_type", "application/json");

            Map<String, Object> payload = new HashMap<>();
            payload.put("contents", List.of(partMap));
            payload.put("generationConfig", generationConfig);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            String responseStr = restTemplate.postForObject(url, request, String.class);

            JsonNode root = objectMapper.readTree(responseStr);
            JsonNode textNode = root.path("candidates").get(0).path("content").path("parts").get(0).path("text");
            String aiResponseText = textNode.asText();

            // Extract the JSON object even if the model wraps it in ```json ... ``` or prose.
            String jsonText = extractJsonObject(aiResponseText);
            JsonNode aiJson = objectMapper.readTree(jsonText);

            double overallBand = resolveOverallBand(aiJson);
            String normalizedFeedback = normalizeFeedbackJson(aiJson, skill, overallBand);

            attempt.setBandScore(overallBand);
            attempt.setFeedback(normalizedFeedback);

        } catch (Exception e) {
            log.error("Error calling Gemini API for grading: {}", e.getMessage(), e);
            attempt.setBandScore(0.0);
            attempt.setFeedback(buildFallbackFeedbackJson(skill, "Lỗi khi gọi AI chấm điểm: " + e.getMessage()));
        }
    }

    private void appendSubmission(StringBuilder promptBuilder, List<Map<String, Object>> parts,
                                  Attempt attempt, List<AnswerRequest> answers, Skill skill) {
        promptBuilder.append("You are a strict, certified senior IELTS examiner with 15+ years of experience. ")
                .append("Grade the following IELTS ").append(skill.name()).append(" submission using the official IELTS band descriptors.\n\n");

        for (AnswerRequest ansReq : answers) {
            Question q = questionRepository.findByExamIdAndQuestionNumber(attempt.getExam().getId(), ansReq.getQuestionNumber()).orElse(null);
            String questionText = q != null ? q.getQuestionText() : ("Task " + ansReq.getQuestionNumber());
            promptBuilder.append("=== Task/Question ").append(ansReq.getQuestionNumber()).append(" ===\n");
            promptBuilder.append("Prompt: ").append(questionText).append("\n");
            if (skill == Skill.SPEAKING && isHttpUrl(ansReq.getAnswerText())) {
                promptBuilder.append("Candidate Answer: see attached audio for this question.\n\n");
                addAudioPart(parts, ansReq.getAnswerText());
            } else {
                promptBuilder.append("Candidate Answer:\n").append(nullSafe(ansReq.getAnswerText())).append("\n\n");
            }
        }
    }

    private void appendGradingInstructions(StringBuilder promptBuilder, Skill skill) {
        boolean writing = skill == Skill.WRITING;
        String criteriaList = writing
                ? "\"Task Achievement/Response\", \"Coherence and Cohesion\", \"Lexical Resource\", \"Grammatical Range and Accuracy\""
                : "\"Fluency and Coherence\", \"Lexical Resource\", \"Grammatical Range and Accuracy\", \"Pronunciation\"";

        promptBuilder.append("\nGrade strictly. Each of the four criteria must be scored on the IELTS 0-9 scale in 0.5 steps. ")
                .append("The overallBand is the average of the four criteria rounded to the nearest 0.5. ")
                .append("Be specific: quote the candidate's own words when giving feedback. ")
                .append("Write every comment, strength, improvement and explanation in natural Vietnamese (the band names stay in English).\n\n");

        promptBuilder.append("Return ONLY a valid JSON object (no markdown, no prose) with EXACTLY this shape:\n")
                .append("{\n")
                .append("  \"overallBand\": <number>,\n")
                .append("  \"criteria\": [ {\"name\": <one of ").append(criteriaList).append(">, \"band\": <number>, \"comment\": <Vietnamese, 2-4 sentences, cite examples>} ] (exactly 4 items),\n")
                .append("  \"strengths\": [<3-5 Vietnamese bullet points>],\n")
                .append("  \"improvements\": [<3-5 Vietnamese, concrete, actionable bullet points>],\n");
        if (writing) {
            promptBuilder.append("  \"corrections\": [ {\"original\": <exact phrase from the candidate>, \"suggestion\": <improved version>, \"explanation\": <Vietnamese why>} ] (5-10 of the most impactful fixes),\n")
                    .append("  \"improvedVersion\": <a fully rewritten Band 8+ model answer for the SAME task, in English>,\n");
        } else {
            promptBuilder.append("  \"corrections\": [ {\"original\": <phrase the candidate said>, \"suggestion\": <more natural/accurate phrasing>, \"explanation\": <Vietnamese why>} ] (4-8 items),\n")
                    .append("  \"pronunciationNotes\": <Vietnamese notes on pronunciation, intonation, pace>,\n");
        }
        promptBuilder.append("  \"summary\": <a 3-5 sentence Vietnamese overall summary and the single most important next step>\n")
                .append("}\n");
    }

    /** Extract the outermost {...} JSON object from arbitrary model text. */
    private String extractJsonObject(String raw) {
        if (raw == null) return "{}";
        String text = raw.trim();
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return text.substring(start, end + 1);
        }
        return "{}";
    }

    private double resolveOverallBand(JsonNode aiJson) {
        double provided = aiJson.has("overallBand") ? aiJson.path("overallBand").asDouble(-1)
                : aiJson.path("bandScore").asDouble(-1);
        if (provided >= 0) {
            return roundHalf(clampBand(provided));
        }
        // Fallback: average the criteria.
        JsonNode criteria = aiJson.path("criteria");
        if (criteria.isArray() && !criteria.isEmpty()) {
            double sum = 0; int n = 0;
            for (JsonNode c : criteria) {
                double b = c.path("band").asDouble(-1);
                if (b >= 0) { sum += b; n++; }
            }
            if (n > 0) return roundHalf(clampBand(sum / n));
        }
        return 0.0;
    }

    private double clampBand(double v) {
        if (v < 0) return 0;
        if (v > 9) return 9;
        return v;
    }

    private double roundHalf(double v) {
        return Math.round(v * 2.0) / 2.0;
    }

    /** Re-serialise the model output into our canonical feedback JSON, filling defaults defensively. */
    private String normalizeFeedbackJson(JsonNode aiJson, Skill skill, double overallBand) {
        try {
            tools.jackson.databind.node.ObjectNode out = objectMapper.createObjectNode();
            out.put("version", 2);
            out.put("skill", skill.name());
            out.put("overallBand", overallBand);
            out.set("criteria", aiJson.has("criteria") ? aiJson.get("criteria") : objectMapper.createArrayNode());
            out.set("strengths", aiJson.has("strengths") ? aiJson.get("strengths") : objectMapper.createArrayNode());
            out.set("improvements", aiJson.has("improvements") ? aiJson.get("improvements") : objectMapper.createArrayNode());
            out.set("corrections", aiJson.has("corrections") ? aiJson.get("corrections") : objectMapper.createArrayNode());
            if (aiJson.has("improvedVersion")) out.set("improvedVersion", aiJson.get("improvedVersion"));
            if (aiJson.has("pronunciationNotes")) out.set("pronunciationNotes", aiJson.get("pronunciationNotes"));
            out.put("summary", aiJson.path("summary").asText(aiJson.path("feedback").asText("")));
            return objectMapper.writeValueAsString(out);
        } catch (Exception e) {
            log.warn("Could not normalize AI feedback JSON, storing summary text: {}", e.getMessage());
            return buildFallbackFeedbackJson(skill, aiJson.path("summary").asText(aiJson.path("feedback").asText("")));
        }
    }

    private String buildFallbackFeedbackJson(Skill skill, String message) {
        try {
            tools.jackson.databind.node.ObjectNode out = objectMapper.createObjectNode();
            out.put("version", 2);
            out.put("skill", skill == null ? "" : skill.name());
            out.set("criteria", objectMapper.createArrayNode());
            out.set("strengths", objectMapper.createArrayNode());
            out.set("improvements", objectMapper.createArrayNode());
            out.set("corrections", objectMapper.createArrayNode());
            out.put("summary", message == null ? "" : message);
            return objectMapper.writeValueAsString(out);
        } catch (Exception e) {
            return "{\"version\":2,\"summary\":\"" + (message == null ? "" : message.replace("\"", "'")) + "\"}";
        }
    }

    private String nullSafe(String text) {
        return text == null ? "" : text;
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
