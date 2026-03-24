package vn.aimhigh.aimhighbackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.aimhigh.aimhighbackend.dto.request.*;
import vn.aimhigh.aimhighbackend.dto.response.*;
import vn.aimhigh.aimhighbackend.enums.AttemptStatus;
import vn.aimhigh.aimhighbackend.exception.BadRequestException;
import vn.aimhigh.aimhighbackend.model.Attempt;
import vn.aimhigh.aimhighbackend.model.Exam;
import vn.aimhigh.aimhighbackend.model.User;
import vn.aimhigh.aimhighbackend.repository.AttemptRepository;
import vn.aimhigh.aimhighbackend.repository.ExamRepository;
import vn.aimhigh.aimhighbackend.repository.UserRepository;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AttemptService {

    private final AttemptRepository attemptRepository;
    private final ExamRepository examRepository;
    private final UserRepository userRepository;
    private final ScoringService scoringService;

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

        // TODO: Lưu Redis timer: exam_timer:{userId}:{examId}
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
        // TODO: Lưu Redis timeout 2h
    }

    public List<ProgressResponse> getProgress(Long attemptId, Long userId) {
        log.info("Lấy tiến độ. attemptId: {}", attemptId);
        // TODO: Đọc Redis
        return List.of();
    }

    @Transactional
    public ResultResponse submitAttempt(Long attemptId, SubmitAttemptRequest request, Long userId) {
        log.info("Nộp bài thi. attemptId: {}", attemptId);
        Attempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new BadRequestException("Attempt không tồn tại"));

        if (attempt.getStatus() == AttemptStatus.SUBMITTED) {
            throw new BadRequestException("Bài làm đã được nộp!");
        }

        // TODO: Xoá Redis Progress, validate Redis Timer

        scoringService.scoreAttempt(attempt, request.getAnswers());

        return ResultResponse.builder()
                .attemptId(attempt.getId())
                .score(attempt.getScore())
                .bandScore(attempt.getBandScore())
                .build();
    }
}
