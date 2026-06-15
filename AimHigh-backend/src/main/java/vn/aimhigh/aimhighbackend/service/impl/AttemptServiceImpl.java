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
import vn.aimhigh.aimhighbackend.model.StudyLog;
import vn.aimhigh.aimhighbackend.model.User;
import vn.aimhigh.aimhighbackend.repository.AttemptRepository;
import vn.aimhigh.aimhighbackend.repository.ExamRepository;
import vn.aimhigh.aimhighbackend.repository.UserRepository;
import vn.aimhigh.aimhighbackend.repository.StudyLogRepository;

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
    private final StudyLogRepository studyLogRepository;

    @Transactional
    public AttemptResponse startAttempt(StartAttemptRequest request, Long userId) {
        log.info("Bắt đầu bài thi: examId={}, userId={}", request.getExamId(), userId);

        Attempt existingAttempt = attemptRepository
            .findByUserIdAndExamIdAndStatus(userId, request.getExamId(), AttemptStatus.IN_PROGRESS)
            .orElse(null);
        if (existingAttempt != null) {
            // Attempt cũ mở từ phiên trước có thể đã quá hạn → làm mới mốc bắt đầu để vẫn nộp được
            // (FE cũng reset đồng hồ mỗi lần mở lại trang, nên đồng bộ lại cho khớp).
            Integer dur = existingAttempt.getExam().getDuration();
            long allowed = (dur == null ? 60 : dur) + 5L;
            if (existingAttempt.getStartedAt() == null
                    || java.time.LocalDateTime.now().isAfter(existingAttempt.getStartedAt().plusMinutes(allowed))) {
                existingAttempt.setStartedAt(java.time.LocalDateTime.now());
                attemptRepository.save(existingAttempt);
            }
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
        
        Map<Integer, SaveProgressRequest> progressMap = new HashMap<>();
        if (rawData != null) {
            progressMap = objectMapper.convertValue(rawData, new TypeReference<Map<Integer, SaveProgressRequest>>() {});
        }
        
        progressMap.put(request.getQuestionNumber(), request);
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
        log.info("Nộp bài thi. attemptId: {}", attemptId);
        Attempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new BadRequestException("Attempt không tồn tại"));

        if (!attempt.getUser().getId().equals(userId)) {
            throw new ForbiddenException("Không có quyền nộp bài");
        }

        if (attempt.getStatus() != AttemptStatus.IN_PROGRESS) {
            throw new BadRequestException("Bài làm đã được nộp!");
        }

        // Chống gian lận: Kiểm tra thời gian làm bài (null-safe + đệm rộng để không khoá nhầm người dùng).
        Integer durationMin = attempt.getExam().getDuration();
        long allowedMinutes = (durationMin == null ? 60 : durationMin) + 15L;
        if (attempt.getStartedAt() != null
                && java.time.LocalDateTime.now().isAfter(attempt.getStartedAt().plusMinutes(allowedMinutes))) {
            throw new BadRequestException("Đã quá thời gian làm bài, không thể nộp bài!");
        }

        Long examId = attempt.getExam().getId();
        redisService.clearExamProgress(userId, examId);
        redisService.delete("exam_timer:" + userId + ":" + examId);

        if (request.getTimeSpent() != null && request.getTimeSpent() >= 0) {
            attempt.setTimeSpent(request.getTimeSpent());
        } else {
            long elapsedSeconds = java.time.Duration.between(attempt.getStartedAt(), java.time.LocalDateTime.now()).getSeconds();
            attempt.setTimeSpent((int) Math.max(0, Math.min(elapsedSeconds, Integer.MAX_VALUE)));
        }

        scoringService.scoreAttempt(attempt, request.getAnswers());

        // Ghi nhật ký học tập nộp bài thi
        studyLogRepository.save(StudyLog.builder()
                .user(attempt.getUser())
                .activity("PRACTICE_SUBMIT")
                .detail(attempt.getExam().getTitle() + " (" + attempt.getExam().getSkill().name() + ")")
                .duration(attempt.getExam().getDuration())
                .createdAt(java.time.LocalDateTime.now())
                .build());

        return ResultResponse.builder()
                .attemptId(attempt.getId())
                .examId(attempt.getExam().getId())
                .examTitle(attempt.getExam().getTitle())
                .skill(attempt.getExam().getSkill())
                .mode(attempt.getMode())
                .totalQuestions(request.getAnswers() == null ? 0 : request.getAnswers().size())
                .totalCorrect(attempt.getTotalCorrect() == null ? 0 : attempt.getTotalCorrect())
                .totalWrong(attempt.getTotalWrong() == null ? 0 : attempt.getTotalWrong())
                .score(attempt.getScore())
                .bandScore(attempt.getBandScore())
                .timeSpent(attempt.getTimeSpent())
                .feedback(attempt.getFeedback())
                .build();
    }
}



