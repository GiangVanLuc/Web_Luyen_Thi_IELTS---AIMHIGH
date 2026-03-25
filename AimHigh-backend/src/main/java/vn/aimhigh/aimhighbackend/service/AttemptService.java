package vn.aimhigh.aimhighbackend.service;

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
public class AttemptService {

    private final AttemptRepository attemptRepository;
    private final ExamRepository examRepository;
    private final UserRepository userRepository;
    private final ScoringService scoringService;
    private final RedisService redisService;
    private final ObjectMapper objectMapper;

    @Transactional
    public AttemptResponse startAttempt(StartAttemptRequest request, Long userId) {
        log.info("Bắt đầu bài thi: examId={}, userId={}", request.getExamId(), userId);
        
        attemptRepository.findByUserIdAndExamIdAndStatus(userId, request.getExamId(), AttemptStatus.IN_PROGRESS)
                .ifPresent(a -> {
                    throw new BadRequestException("Bạn đang có một bài thi chưa hoàn thành");
                });

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User không tồn tại"));
        Exam exam = examRepository.findById(request.getExamId())
                .orElseThrow(() -> new BadRequestException("Exam không tồn tại"));

        Attempt attempt = Attempt.builder()
                .user(user)
                .exam(exam)
                .mode(request.getMode())
                .status(AttemptStatus.IN_PROGRESS)
                .build();
        
        attemptRepository.save(attempt);

        // Lưu Redis timer
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
        log.info("Lưu tiến độ. attemptId: {}", attemptId);
        Attempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new BadRequestException("Attempt không tồn tại"));
                
        if (!attempt.getUser().getId().equals(userId)) {
            throw new ForbiddenException("Không có quyền lưu tiến độ");
        }
        
        Long examId = attempt.getExam().getId();
        Object rawData = redisService.getExamProgress(userId, examId);
        
        Map<Long, SaveProgressRequest> progressMap = new HashMap<>();
        if (rawData != null) {
            progressMap = objectMapper.convertValue(rawData, new TypeReference<Map<Long, SaveProgressRequest>>() {});
        }
        
        progressMap.put(request.getQuestionId(), request);
        redisService.saveExamProgress(userId, examId, progressMap);
    }

    public List<ProgressResponse> getProgress(Long attemptId, Long userId) {
        log.info("Lấy tiến độ. attemptId: {}", attemptId);
        Attempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new BadRequestException("Attempt không tồn tại"));
                
        if (!attempt.getUser().getId().equals(userId)) {
            throw new ForbiddenException("Không có quyền lấy tiến độ");
        }

        Object rawData = redisService.getExamProgress(userId, attempt.getExam().getId());
        if (rawData == null) return new ArrayList<>();
        
        Map<Long, SaveProgressRequest> progressMap = objectMapper.convertValue(rawData, new TypeReference<Map<Long, SaveProgressRequest>>() {});
        
        return progressMap.values().stream().map(req -> 
                ProgressResponse.builder()
                        .questionId(req.getQuestionId())
                        .answerText(req.getAnswerText())
                        .build()
        ).collect(Collectors.toList());
    }

    @Transactional
    public ResultResponse submitAttempt(Long attemptId, SubmitAttemptRequest request, Long userId) {
        log.info("Nộp bài thi. attemptId: {}", attemptId);
        Attempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new BadRequestException("Attempt không tồn tại"));

        if (!attempt.getUser().getId().equals(userId)) {
            throw new ForbiddenException("Không có quyền nộp bài");
        }

        if (attempt.getStatus() == AttemptStatus.SUBMITTED) {
            throw new BadRequestException("Bài làm đã được nộp!");
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
