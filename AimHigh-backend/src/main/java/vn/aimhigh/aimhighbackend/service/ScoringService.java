package vn.aimhigh.aimhighbackend.service;

import vn.aimhigh.aimhighbackend.dto.request.AnswerRequest;
import vn.aimhigh.aimhighbackend.enums.Skill;
import vn.aimhigh.aimhighbackend.model.Attempt;
import vn.aimhigh.aimhighbackend.model.Question;

import java.util.List;

public interface ScoringService {
    void scoreAttempt(Attempt attempt, List<AnswerRequest> answers);

    Boolean scoreAnswer(Question question, String answerText);

    Double calculateBandScore(int totalCorrect, Skill skill);
}
