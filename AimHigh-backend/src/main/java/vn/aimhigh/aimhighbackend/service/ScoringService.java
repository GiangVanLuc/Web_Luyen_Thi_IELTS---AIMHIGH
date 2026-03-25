package vn.aimhigh.aimhighbackend.service;

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

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScoringService {

    private final QuestionRepository questionRepository;
    private final AttemptRepository attemptRepository;

    @org.springframework.transaction.annotation.Transactional
    public void scoreAttempt(Attempt attempt, List<AnswerRequest> answers) {
        log.info("Chấm điểm attempt: {}", attempt.getId());
        int totalCorrect = 0, totalWrong = 0;
        
        java.util.List<vn.aimhigh.aimhighbackend.model.Answer> savedAnswers = new java.util.ArrayList<>();

        for (AnswerRequest answerReq : answers) {
            Question q = questionRepository.findById(answerReq.getQuestionId()).orElse(null);
            if (q != null) {
                boolean isCorrect = scoreAnswer(q, answerReq.getAnswerText());
                if (isCorrect) totalCorrect++;
                else if (!Boolean.TRUE.equals(answerReq.getIsSkipped())) totalWrong++;
                
                savedAnswers.add(vn.aimhigh.aimhighbackend.model.Answer.builder()
                        .attempt(attempt)
                        .question(q)
                        .answerText(answerReq.getAnswerText())
                        .isSkipped(answerReq.getIsSkipped() != null ? answerReq.getIsSkipped() : false)
                        .isCorrect(isCorrect)
                        .build());
            }
        }
        
        attempt.setAnswers(savedAnswers);
        attempt.setTotalCorrect(totalCorrect);
        attempt.setTotalWrong(totalWrong);
        attempt.setStatus(AttemptStatus.SUBMITTED);
        attempt.setSubmittedAt(LocalDateTime.now());
        attempt.setBandScore(calculateBandScore(totalCorrect, attempt.getExam().getSkill()));
        attemptRepository.save(attempt);
    }

    public Boolean scoreAnswer(Question question, String answerText) {
        if (answerText == null || answerText.trim().isEmpty() || question.getCorrectAnswer() == null) return false;
        // TODO: Enhance mapping theo QuestionType (Fill in blank, true false)
        return answerText.trim().toLowerCase().equals(question.getCorrectAnswer().trim().toLowerCase());
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
