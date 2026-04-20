package vn.aimhigh.aimhighbackend.service.impl;

import vn.aimhigh.aimhighbackend.service.RedisService;
import vn.aimhigh.aimhighbackend.service.AttemptService;
import vn.aimhigh.aimhighbackend.service.ScoringService;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.aimhigh.aimhighbackend.dto.request.*;
import vn.aimhigh.aimhighbackend.dto.response.*;
import vn.aimhigh.aimhighbackend.enums.AttemptStatus;
import vn.aimhigh.aimhighbackend.exception.BadRequestException;
import vn.aimhigh.aimhighbackend.exception.ForbiddenException;
import vn.aimhigh.aimhighbackend.model.Attempt;
import vn.aimhigh.aimhighbackend.model.Exam;
import vn.aimhigh.aimhighbackend.model.User;
import vn.aimhigh.aimhighbackend.repository.AttemptRepository;
import vn.aimhigh.aimhighbackend.repository.ExamRepository;
import vn.aimhigh.aimhighbackend.repository.UserRepository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AttemptServiceImpl implements AttemptService {

    private final AttemptRepository attemptRepository;
    private final ExamRepository examRepository;
    private final UserRepository userRepository;
    private final ScoringService scoringService;
    private final RedisService redisService;
    private final ObjectMapper objectMapper;

    @Transactional
    public AttemptResponse startAttempt(StartAttemptRequest request, Long userId) {
        log.info("Báº¯t Ä‘áº§u bÃ i thi: examId={}, userId={}", request.getExamId(), userId);

        Attempt existingAttempt = attemptRepository
            .findByUserIdAndExamIdAndStatus(userId, request.getExamId(), AttemptStatus.IN_PROGRESS)
            .orElse(null);
        if (existingAttempt != null) {
            return AttemptResponse.builder()
                .id(existingAttempt.getId())
                .examId(existingAttempt.getExam().getId())
                .examTitle(existingAttempt.getExam().getTitle())
                .mode(existingAttempt.getMode())
                .status(existingAttempt.getStatus())
                .startedAt(existingAttempt.getStartedAt())
                .duration(existingAttempt.getExam().getDuration())
                .build();
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User khÃ´ng tá»“n táº¡i"));
        Exam exam = examRepository.findById(request.getExamId())
                .orElseThrow(() -> new BadRequestException("Exam khÃ´ng tá»“n táº¡i"));

        Attempt attempt = Attempt.builder()
                .user(user)
                .exam(exam)
                .mode(request.getMode())
                .status(AttemptStatus.IN_PROGRESS)
                .build();
        
        attemptRepository.save(attempt);

        // LÆ°u Redis timer
        redisService.startExamTimer(userId, exam.getId(), exam.getDuration());
        
        return AttemptResponse.builder()
                .id(attempt.getId())
                .examId(exam.getId())
                .examTitle(exam.getTitle())
                .mode(attempt.getMode())
                .status(attempt.getStatus())
                .startedAt(attempt.getStartedAt())
                .duration(exam.getDuration())
                .build();
    }

    public void saveProgress(Long attemptId, SaveProgressRequest request, Long userId) {
        log.info("LÆ°u tiáº¿n Ä‘á»™. attemptId: {}", attemptId);
        Attempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new BadRequestException("Attempt khÃ´ng tá»“n táº¡i"));
                
        if (!attempt.getUser().getId().equals(userId)) {
            throw new ForbiddenException("KhÃ´ng cÃ³ quyá»n lÆ°u tiáº¿n Ä‘á»™");
        }
        
        Long examId = attempt.getExam().getId();
        Object rawData = redisService.getExamProgress(userId, examId);
        
        Map<Integer, SaveProgressRequest> progressMap = new HashMap<>();
        if (rawData != null) {
            progressMap = objectMapper.convertValue(rawData, new TypeReference<Map<Integer, SaveProgressRequest>>() {});
        }
        
        progressMap.put(request.getQuestionNumber(), request);
        redisService.saveExamProgress(userId, examId, progressMap);
    }

    public List<ProgressResponse> getProgress(Long attemptId, Long userId) {
        log.info("Láº¥y tiáº¿n Ä‘á»™. attemptId: {}", attemptId);
        Attempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new BadRequestException("Attempt khÃ´ng tá»“n táº¡i"));
                
        if (!attempt.getUser().getId().equals(userId)) {
            throw new ForbiddenException("KhÃ´ng cÃ³ quyá»n láº¥y tiáº¿n Ä‘á»™");
        }

        Object rawData = redisService.getExamProgress(userId, attempt.getExam().getId());
        if (rawData == null) return new ArrayList<>();
        
        Map<Integer, SaveProgressRequest> progressMap = objectMapper.convertValue(rawData, new TypeReference<Map<Integer, SaveProgressRequest>>() {});
        
        return progressMap.values().stream().map(req -> 
                ProgressResponse.builder()
                        .questionId(Long.valueOf(req.getQuestionNumber()))
                        .answerText(req.getAnswerText())
                        .build()
        ).collect(Collectors.toList());
    }

    @Transactional
    public ResultResponse submitAttempt(Long attemptId, SubmitAttemptRequest request, Long userId) {
        log.info("Ná»™p bÃ i thi. attemptId: {}", attemptId);
        Attempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new BadRequestException("Attempt khÃ´ng tá»“n táº¡i"));

        if (!attempt.getUser().getId().equals(userId)) {
            throw new ForbiddenException("KhÃ´ng cÃ³ quyá»n ná»™p bÃ i");
        }

        if (attempt.getStatus() == AttemptStatus.SUBMITTED) {
            throw new BadRequestException("BÃ i lÃ m Ä‘Ã£ Ä‘Æ°á»£c ná»™p!");
        }

        Long examId = attempt.getExam().getId();
        redisService.clearExamProgress(userId, examId);
        redisService.delete("exam_timer:" + userId + ":" + examId);

        scoringService.scoreAttempt(attempt, request.getAnswers());

        return ResultResponse.builder()
                .attemptId(attempt.getId())
                .score(attempt.getScore())
                .bandScore(attempt.getBandScore())
                .build();
    }
}



