package vn.aimhigh.aimhighbackend.service.impl;

import vn.aimhigh.aimhighbackend.service.ResultService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import vn.aimhigh.aimhighbackend.dto.response.AttemptResponse;
import vn.aimhigh.aimhighbackend.dto.response.ResultResponse;
import vn.aimhigh.aimhighbackend.dto.response.QuestionResponse;
import vn.aimhigh.aimhighbackend.enums.AttemptStatus;
import vn.aimhigh.aimhighbackend.exception.BadRequestException;
import vn.aimhigh.aimhighbackend.exception.ResourceNotFoundException;
import vn.aimhigh.aimhighbackend.exception.ForbiddenException;
import vn.aimhigh.aimhighbackend.model.Attempt;
import vn.aimhigh.aimhighbackend.model.Answer;
import vn.aimhigh.aimhighbackend.model.Question;
import vn.aimhigh.aimhighbackend.model.ListeningPart;
import vn.aimhigh.aimhighbackend.model.ReadingPassage;
import vn.aimhigh.aimhighbackend.repository.AttemptRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ResultServiceImpl implements ResultService {
    
    private final AttemptRepository attemptRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public ResultResponse getResult(Long attemptId, Long userId) {
        log.info("Get Result Attempt: {}", attemptId);
        
        Attempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("không tìm thấy bài thi"));
                
        // Kiá»ƒm tra quyá»n (pháº£i lÃ  bÃ i cá»§a mÃ¬nh)
        if (!attempt.getUser().getId().equals(userId)) {
            throw new ForbiddenException("KhÃ´ng cÃ³ quyá»n xem Ä‘iá»ƒm cá»§a ngÆ°á»i khÃ¡c");
        }

        if (attempt.getStatus() == AttemptStatus.IN_PROGRESS) {
            throw new BadRequestException("Bài làm chưa được nộp, chưa thể xem kết quả");
        }

        List<Answer> attemptAnswers = attempt.getAnswers() == null ? List.of() : attempt.getAnswers();

        Map<Long, Answer> answerMap = attemptAnswers.stream()
            .collect(Collectors.toMap(a -> a.getQuestion().getId(), a -> a, (oldValue, newValue) -> newValue));
        Map<Integer, String> questionTypes = extractQuestionTypes(attempt.getExam().getExamData());

        return ResultResponse.builder()
                .attemptId(attempt.getId())
            .examId(attempt.getExam().getId())
                .examTitle(attempt.getExam().getTitle())
                .skill(attempt.getExam().getSkill())
                .mode(attempt.getMode())
                .totalQuestions(attemptAnswers.size())
                .totalCorrect(attempt.getTotalCorrect() == null ? 0 : attempt.getTotalCorrect())
                .totalWrong(attempt.getTotalWrong() == null ? 0 : attempt.getTotalWrong())
                .score(attempt.getScore())
                .bandScore(attempt.getBandScore())
                .feedback(attempt.getFeedback())
                .timeSpent(attempt.getTimeSpent())
                .parts(attempt.getExam().getListeningParts() == null ? null : 
                    buildPartResponses(attempt.getExam().getListeningParts(), answerMap, questionTypes))
                .passages(attempt.getExam().getReadingPassages() == null ? null : 
                    buildPassageResponses(attempt.getExam().getReadingPassages(), answerMap, questionTypes))
                .build();
    }

    @Transactional(readOnly = true)
    public List<AttemptResponse> getMyAttempts(Long userId) {
        return attemptRepository.findByUserIdOrderByStartedAtDesc(userId).stream()
                .map(attempt -> AttemptResponse.builder()
                        .id(attempt.getId())
                        .examId(attempt.getExam() != null ? attempt.getExam().getId() : null)
                        .examTitle(attempt.getExam() != null ? attempt.getExam().getTitle() : null)
                        .mode(attempt.getMode())
                        .status(attempt.getStatus())
                        .startedAt(attempt.getStartedAt())
                        .duration(attempt.getExam() != null ? attempt.getExam().getDuration() : null)
                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<AttemptResponse> getTestHistory(Long userId, Pageable pageable) {
        return attemptRepository.findByUserIdOrderByStartedAtDesc(userId, pageable)
                .map(attempt -> AttemptResponse.builder()
                        .id(attempt.getId())
                        .examId(attempt.getExam() != null ? attempt.getExam().getId() : null)
                        .examTitle(attempt.getExam() != null ? attempt.getExam().getTitle() : null)
                        .mode(attempt.getMode())
                        .status(attempt.getStatus())
                        .startedAt(attempt.getStartedAt())
                        .duration(attempt.getExam() != null ? attempt.getExam().getDuration() : null)
                        .build());
    }

            private List<ResultResponse.ResultPartResponse> buildPartResponses(
                List<ListeningPart> parts,
                Map<Long, Answer> answerMap,
                Map<Integer, String> questionTypes
            ) {
        return parts.stream().map(part -> {
                List<ResultResponse.ResultQuestionResponse> questions = mapResultQuestions(part.getQuestions(), answerMap, questionTypes);
            int correct = (int) questions.stream().filter(q -> Boolean.TRUE.equals(q.getIsCorrect())).count();
            return ResultResponse.ResultPartResponse.builder()
                    .sectionNumber(part.getPartNumber())
                    .label(part.getTitle() != null && !part.getTitle().isBlank() ? part.getTitle() : "Section " + part.getPartNumber())
                    .totalQuestions(questions.size())
                    .correctCount(correct)
                    .questions(questions)
                    .build();
        }).collect(Collectors.toList());
    }

        private List<ResultResponse.ResultPassageResponse> buildPassageResponses(
            List<ReadingPassage> passages,
            Map<Long, Answer> answerMap,
            Map<Integer, String> questionTypes
        ) {
        return passages.stream().map(passage -> {
            List<ResultResponse.ResultQuestionResponse> questions = mapResultQuestions(passage.getQuestions(), answerMap, questionTypes);
            int correct = (int) questions.stream().filter(q -> Boolean.TRUE.equals(q.getIsCorrect())).count();
            Integer passageOrder = passage.getEffectivePassageOrderInSection() != null
                ? passage.getEffectivePassageOrderInSection()
                : passage.getPassageOrder();
            String defaultLabel = "Passage " + (passageOrder == null ? "" : passageOrder);
            return ResultResponse.ResultPassageResponse.builder()
                .passageOrder(passageOrder)
                    .label(passage.getTitle() != null && !passage.getTitle().isBlank() ? passage.getTitle() : defaultLabel.trim())
                    .totalQuestions(questions.size())
                    .correctCount(correct)
                    .questions(questions)
                    .build();
        }).collect(Collectors.toList());
    }
    
    private List<ResultResponse.ResultQuestionResponse> mapResultQuestions(
            List<Question> questions,
            Map<Long, Answer> answerMap,
            Map<Integer, String> questionTypes
    ) {
        if (questions == null) return new ArrayList<>();
        return questions.stream().map(q -> {
            Answer ans = answerMap.get(q.getId());
            boolean isCorrect = ans != null && Boolean.TRUE.equals(ans.getIsCorrect());
            boolean isSkipped = ans == null || Boolean.TRUE.equals(ans.getIsSkipped());
            String userAnswer = ans != null ? ans.getAnswerText() : null;
            return ResultResponse.ResultQuestionResponse.builder()
                    .questionNumber(q.getQuestionNumber())
                    .questionText(q.getQuestionText())
                    .questionType(questionTypes.getOrDefault(q.getQuestionNumber(), "Other"))
                    .correctAnswer(q.getCorrectAnswer())
                .explanation(buildExplanationText(q, userAnswer, isCorrect, isSkipped))
                    .audioStart(q.getAudioStart())
                    .audioEnd(q.getAudioEnd())
                .userAnswer(userAnswer)
                .isCorrect(isCorrect)
                .isSkipped(isSkipped)
                    .choices(q.getChoices() == null ? null : q.getChoices().stream().map(c -> 
                                QuestionResponse.ChoiceDto.builder()
                                        .id(c.getId())
                                        .label(c.getChoiceLabel())
                                        .text(c.getChoiceText())
                                        .build()
                        ).collect(Collectors.toList()))
                    .build();
        }).collect(Collectors.toList());
    }

    private Map<Integer, String> extractQuestionTypes(String examData) {
        Map<Integer, String> types = new HashMap<>();
        if (examData == null || examData.isBlank()) {
            return types;
        }

        try {
            JsonNode root = objectMapper.readTree(examData);
            JsonNode sections = root.path("sections");
            if (!sections.isArray()) {
                return types;
            }

            for (JsonNode section : sections) {
                JsonNode groups = section.path("groups");
                if (!groups.isArray()) {
                    continue;
                }
                for (JsonNode group : groups) {
                    String displayType = group.path("displayType").asText("");
                    if (displayType == null || displayType.isBlank()) {
                        displayType = group.path("type").asText("OTHER");
                    }
                    String normalizedType = normalizeQuestionType(displayType);

                    JsonNode questions = group.path("questions");
                    if (questions.isArray()) {
                        for (JsonNode question : questions) {
                            int qn = question.path("questionNumber").asInt(0);
                            if (qn > 0) {
                                types.put(qn, normalizedType);
                            }
                        }
                    }

                    JsonNode subBlocks = group.path("subBlocks");
                    if (subBlocks.isArray()) {
                        for (JsonNode subBlock : subBlocks) {
                            JsonNode subQuestions = subBlock.path("questions");
                            if (!subQuestions.isArray()) {
                                continue;
                            }
                            for (JsonNode question : subQuestions) {
                                int qn = question.path("questionNumber").asInt(0);
                                if (qn > 0) {
                                    types.put(qn, normalizedType);
                                }
                            }
                        }
                    }

                    JsonNode tableRows = group.path("tableRows");
                    if (tableRows.isArray()) {
                        for (JsonNode row : tableRows) {
                            JsonNode cells = row.path("cells");
                            if (!cells.isArray()) {
                                continue;
                            }
                            for (JsonNode cell : cells) {
                                int qn = cell.path("questionNumber").asInt(0);
                                if (qn > 0) {
                                    types.put(qn, normalizedType);
                                }
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("KhÃ´ng thá»ƒ parse question types tá»« examData", e);
        }

        return types;
    }

    private String normalizeQuestionType(String displayType) {
        return switch (displayType) {
            case "TRUE_FALSE_NG" -> "True - False - Not Given";
            case "SUMMARY_COMPLETION" -> "Summary Completion";
            case "TABLE_COMPLETION" -> "Table Completion";
            case "FILL_BLOCK" -> "Sentence Completion";
            case "MATCHING" -> "Matching";
            case "MATCHING_HEADINGS" -> "Matching Headings";
            case "MULTIPLE_CHOICE" -> "Multiple Choice";
            default -> "Other";
        };
    }

    private String buildExplanationText(Question q, String userAnswer, boolean isCorrect, boolean isSkipped) {
        if (q.getExplanation() != null && !q.getExplanation().isBlank()) {
            return q.getExplanation();
        }

        if (isSkipped) {
            return "Báº¡n Ä‘Ã£ bá» qua cÃ¢u nÃ y. ÄÃ¡p Ã¡n Ä‘Ãºng lÃ : " + nullSafe(q.getCorrectAnswer()) + ".";
        }

        if (isCorrect) {
            return "Báº¡n tráº£ lá»i Ä‘Ãºng. ÄÃ¡p Ã¡n chuáº©n lÃ : " + nullSafe(q.getCorrectAnswer()) + ".";
        }

        return "Báº¡n tráº£ lá»i \"" + nullSafe(userAnswer) + "\" nhÆ°ng Ä‘Ã¡p Ã¡n Ä‘Ãºng lÃ  \""
                + nullSafe(q.getCorrectAnswer()) + "\". HÃ£y chÃº Ã½ tá»« khÃ³a vÃ  dáº¡ng cÃ¢u há»i.";
    }

    private String nullSafe(String text) {
        return text == null ? "(trá»‘ng)" : text;
    }
}



