package vn.aimhigh.aimhighbackend.service.impl;

import vn.aimhigh.aimhighbackend.service.ScoringService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import vn.aimhigh.aimhighbackend.dto.request.AnswerRequest;
import vn.aimhigh.aimhighbackend.enums.AttemptStatus;
import vn.aimhigh.aimhighbackend.enums.Skill;
import vn.aimhigh.aimhighbackend.model.Attempt;
import vn.aimhigh.aimhighbackend.model.Question;
import vn.aimhigh.aimhighbackend.repository.AttemptRepository;
import vn.aimhigh.aimhighbackend.repository.QuestionRepository;
import vn.aimhigh.aimhighbackend.service.AiGradingService;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScoringServiceImpl implements ScoringService {

    private final QuestionRepository questionRepository;
    private final AttemptRepository attemptRepository;
    private final AiGradingService aiGradingService;

    @org.springframework.transaction.annotation.Transactional
    public void scoreAttempt(Attempt attempt, List<AnswerRequest> answers) {
        log.info("Chấm điểm attempt: {}", attempt.getId());
        int totalCorrect = 0, totalWrong = 0;
        Skill skill = attempt.getExam().getSkill();

        Map<Long, vn.aimhigh.aimhighbackend.model.Answer> answerByQuestionId = new LinkedHashMap<>();

        for (AnswerRequest answerReq : answers) {
            Question q = questionRepository.findByExamIdAndQuestionNumber(attempt.getExam().getId(), answerReq.getQuestionNumber()).orElse(null);
            if (q == null && (skill == Skill.WRITING || skill == Skill.SPEAKING)) {
                q = Question.builder()
                        .exam(attempt.getExam())
                        .questionNumber(answerReq.getQuestionNumber())
                        .questionOrder(answerReq.getQuestionNumber())
                        .questionText("Question " + answerReq.getQuestionNumber())
                        .points(1.0)
                        .build();
                q = questionRepository.save(q);
            }
            if (q != null) {
                boolean isCorrect = scoreAnswer(q, answerReq.getAnswerText());

                vn.aimhigh.aimhighbackend.model.Answer answer = vn.aimhigh.aimhighbackend.model.Answer.builder()
                        .attempt(attempt)
                        .question(q)
                        .answerText(answerReq.getAnswerText())
                        .isSkipped(answerReq.getIsSkipped() != null ? answerReq.getIsSkipped() : false)
                        .isCorrect(isCorrect)
                        .build();

                answerByQuestionId.put(q.getId(), answer);
            }
        }

        java.util.List<vn.aimhigh.aimhighbackend.model.Answer> savedAnswers = new java.util.ArrayList<>(answerByQuestionId.values());
        for (vn.aimhigh.aimhighbackend.model.Answer answer : savedAnswers) {
            if (Boolean.TRUE.equals(answer.getIsCorrect())) {
                totalCorrect++;
            } else if (!Boolean.TRUE.equals(answer.getIsSkipped())) {
                totalWrong++;
            }
        }

        attempt.setAnswers(savedAnswers);
        attempt.setTotalCorrect(totalCorrect);
        attempt.setTotalWrong(totalWrong);
        attempt.setStatus(AttemptStatus.SUBMITTED);
        attempt.setSubmittedAt(LocalDateTime.now());
        
        if (skill == Skill.WRITING || skill == Skill.SPEAKING) {
            aiGradingService.grade(attempt, answers);
            attempt.setStatus(vn.aimhigh.aimhighbackend.enums.AttemptStatus.valueOf("GRADED"));
        } else {
            attempt.setBandScore(calculateBandScore(totalCorrect, skill));
        }
        
        attemptRepository.save(attempt);
    }

    public Boolean scoreAnswer(Question question, String answerText) {
        if (answerText == null || answerText.trim().isEmpty() || question.getCorrectAnswer() == null) return false;
        
        String actualStr = sanitize(answerText);
        String[] possibleAnswers = question.getCorrectAnswer().split("/");
        
        for (String expectedVar : possibleAnswers) {
            if (isTrueFalseShortcut(actualStr, sanitize(expectedVar))) {
                return true;
            }
            
            java.util.List<String> combinations = generateCombinations(expectedVar);
            for (String combo : combinations) {
                if (actualStr.equals(sanitize(combo))) {
                    return true;
                }
            }
        }
        return false;
    }

    private java.util.List<String> generateCombinations(String format) {
        java.util.List<String> results = new java.util.ArrayList<>();
        results.add(format);
        if (format.contains("(") && format.contains(")")) {
            String withoutBracket = format.replaceAll("\\(.*?\\)", "").replaceAll("\\s+", " ").trim();
            results.add(withoutBracket);
            
            String withBracket = format.replaceAll("[\\(\\)]", "").replaceAll("\\s+", " ").trim();
            results.add(withBracket);
        }
        return results;
    }

    private String sanitize(String input) {
        if (input == null) return "";
        String sanitized = input.trim().toLowerCase();
        // Remove commas used as thousands separators in numbers (e.g. 10,000 -> 10000)
        sanitized = sanitized.replaceAll("(?<=\\d),(?=\\d)", "");
        // Remove articles
        sanitized = sanitized.replaceAll("\\b(a|an|the)\\b", "");
        // Remove punctuation except decimal points
        sanitized = sanitized.replaceAll("(?<!\\d)[.,;!?](?!\\d)", "");
        sanitized = sanitized.replaceAll("[.,;!?]$", "");
        return sanitized.replaceAll("\\s+", " ").trim();
    }

    private boolean isTrueFalseShortcut(String actual, String expected) {
        if (expected.equals("true") && (actual.equals("t") || actual.equals("true"))) return true;
        if (expected.equals("false") && (actual.equals("f") || actual.equals("false"))) return true;
        if (expected.equals("not given") && (actual.equals("ng") || actual.equals("not given"))) return true;
        if (expected.equals("yes") && (actual.equals("y") || actual.equals("yes"))) return true;
        if (expected.equals("no") && (actual.equals("n") || actual.equals("no"))) return true;
        return false;
    }

    public Double calculateBandScore(int totalCorrect, Skill skill) {
        if (skill == Skill.LISTENING) {
            if (totalCorrect >= 39) return 9.0;
            if (totalCorrect >= 37) return 8.5;
            if (totalCorrect >= 35) return 8.0;
            if (totalCorrect >= 32) return 7.5;
            if (totalCorrect >= 30) return 7.0;
            if (totalCorrect >= 28) return 6.5;
            if (totalCorrect >= 26) return 6.0;
            if (totalCorrect >= 23) return 5.5;
            if (totalCorrect >= 21) return 5.0;
            if (totalCorrect >= 18) return 4.5;
            if (totalCorrect >= 16) return 4.0;
            if (totalCorrect >= 13) return 3.5;
            return 0.0;
        } else {
            if (totalCorrect >= 39) return 9.0;
            if (totalCorrect >= 38) return 8.5;
            if (totalCorrect >= 35) return 8.0;
            if (totalCorrect >= 33) return 7.5;
            if (totalCorrect >= 30) return 7.0;
            if (totalCorrect >= 27) return 6.5;
            if (totalCorrect >= 23) return 6.0;
            if (totalCorrect >= 19) return 5.5;
            if (totalCorrect >= 15) return 5.0;
            if (totalCorrect >= 13) return 4.5;
            if (totalCorrect >= 10) return 4.0;
            if (totalCorrect >= 8) return 3.5;
            return 0.0;
        }
    }
}



