package vn.aimhigh.aimhighbackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import vn.aimhigh.aimhighbackend.dto.response.ResultResponse;
import vn.aimhigh.aimhighbackend.dto.response.QuestionResponse;
import vn.aimhigh.aimhighbackend.exception.ResourceNotFoundException;
import vn.aimhigh.aimhighbackend.exception.ForbiddenException;
import vn.aimhigh.aimhighbackend.model.Attempt;
import vn.aimhigh.aimhighbackend.model.Answer;
import vn.aimhigh.aimhighbackend.model.Question;
import vn.aimhigh.aimhighbackend.repository.AttemptRepository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ResultService {
    
    private final AttemptRepository attemptRepository;

    public ResultResponse getResult(Long attemptId, Long userId) {
        log.info("Get Result Attempt: {}", attemptId);
        
        Attempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài thi"));
                
        // Kiểm tra quyền (phải là bài của mình)
        if (!attempt.getUser().getId().equals(userId)) {
            throw new ForbiddenException("Không có quyền xem điểm của người khác");
        }

        Map<Long, Answer> answerMap = attempt.getAnswers().stream()
                .collect(Collectors.toMap(a -> a.getQuestion().getId(), a -> a));

        return ResultResponse.builder()
                .attemptId(attempt.getId())
                .examTitle(attempt.getExam().getTitle())
                .skill(attempt.getExam().getSkill())
                .mode(attempt.getMode())
                .totalQuestions(attempt.getAnswers().size())
                .totalCorrect(attempt.getTotalCorrect())
                .totalWrong(attempt.getTotalWrong())
                .score(attempt.getScore())
                .bandScore(attempt.getBandScore())
                .timeSpent(attempt.getTimeSpent())
                .parts(attempt.getExam().getListeningParts() == null ? null : 
                       attempt.getExam().getListeningParts().stream().map(part -> 
                            ResultResponse.ResultPartResponse.builder()
                                .questions(mapResultQuestions(part.getQuestions(), answerMap))
                                .build()
                       ).collect(Collectors.toList()))
                .passages(attempt.getExam().getReadingPassages() == null ? null : 
                       attempt.getExam().getReadingPassages().stream().map(passage -> 
                            ResultResponse.ResultPassageResponse.builder()
                                .questions(mapResultQuestions(passage.getQuestions(), answerMap))
                                .build()
                       ).collect(Collectors.toList()))
                .build();
    }
    
    private List<ResultResponse.ResultQuestionResponse> mapResultQuestions(List<Question> questions, Map<Long, Answer> answerMap) {
        if (questions == null) return null;
        return questions.stream().map(q -> {
            Answer ans = answerMap.get(q.getId());
            return ResultResponse.ResultQuestionResponse.builder()
                    .questionNumber(q.getQuestionNumber())
                    .questionText(q.getQuestionText())
                    .correctAnswer(q.getCorrectAnswer())
                    .explanation(q.getExplanation())
                    .audioStart(q.getAudioStart())
                    .audioEnd(q.getAudioEnd())
                    .userAnswer(ans != null ? ans.getAnswerText() : null)
                    .isCorrect(ans != null ? ans.getIsCorrect() : false)
                    .isSkipped(ans != null ? ans.getIsSkipped() : true)
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
}
