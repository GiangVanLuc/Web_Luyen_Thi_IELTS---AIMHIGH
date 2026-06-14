package vn.aimhigh.aimhighbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.aimhigh.aimhighbackend.dto.request.AdminGradeRequest;
import vn.aimhigh.aimhighbackend.dto.response.AdminSubmissionResponse;
import vn.aimhigh.aimhighbackend.enums.AttemptStatus;
import vn.aimhigh.aimhighbackend.enums.NotificationType;
import vn.aimhigh.aimhighbackend.enums.Skill;
import vn.aimhigh.aimhighbackend.exception.ResourceNotFoundException;
import vn.aimhigh.aimhighbackend.model.Attempt;
import vn.aimhigh.aimhighbackend.model.Notification;
import vn.aimhigh.aimhighbackend.repository.AttemptRepository;
import vn.aimhigh.aimhighbackend.repository.NotificationRepository;
import vn.aimhigh.aimhighbackend.service.AdminSubmissionService;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminSubmissionServiceImpl implements AdminSubmissionService {

    private final AttemptRepository attemptRepository;
    private final NotificationRepository notificationRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<AdminSubmissionResponse> getSubmissions(String skillFilter, Pageable pageable) {
        return attemptRepository.findByExamSkillIn(resolveSubmissionSkills(skillFilter), pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AdminSubmissionResponse> getUngradedSubmissions(String skillFilter, Pageable pageable) {
        return attemptRepository.findByExamSkillInAndStatus(resolveSubmissionSkills(skillFilter), AttemptStatus.SUBMITTED, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional
    public void gradeSubmission(Long attemptId, AdminGradeRequest request) {
        Attempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài làm của học viên"));

        attempt.setBandScore(request.getBandScore());
        attempt.setFeedback(request.getFeedback());
        attempt.setStatus(AttemptStatus.GRADED);
        attemptRepository.save(attempt);

        if (attempt.getUser() != null && attempt.getExam() != null) {
            notificationRepository.save(Notification.builder()
                    .user(attempt.getUser())
                    .title("Kết quả bài thi " + attempt.getExam().getSkill().name())
                    .message("Bài làm '" + attempt.getExam().getTitle() + "' của bạn đã được chấm: Band " + attempt.getBandScore())
                    .type(NotificationType.RESULT)
                    .isRead(false)
                    .build());
        }
    }

    private List<Skill> resolveSubmissionSkills(String skillFilter) {
        List<Skill> skills = new ArrayList<>();
        if (skillFilter != null && !skillFilter.isBlank() && !skillFilter.equalsIgnoreCase("ALL")) {
            try {
                skills.add(Skill.valueOf(skillFilter.toUpperCase()));
            } catch (IllegalArgumentException e) {
                skills.add(Skill.WRITING);
                skills.add(Skill.SPEAKING);
            }
        } else {
            skills.add(Skill.WRITING);
            skills.add(Skill.SPEAKING);
        }
        return skills;
    }

    private AdminSubmissionResponse toResponse(Attempt attempt) {
        List<AdminSubmissionResponse.AnswerDto> answerDtos = Collections.emptyList();
        if (attempt.getAnswers() != null) {
            answerDtos = attempt.getAnswers().stream()
                    .filter(ans -> ans.getQuestion() != null)
                    .map(ans -> AdminSubmissionResponse.AnswerDto.builder()
                            .questionNumber(ans.getQuestion().getQuestionNumber())
                            .questionText(ans.getQuestion().getQuestionText())
                            .answerText(ans.getAnswerText())
                            .correctAnswer(ans.getQuestion().getCorrectAnswer())
                            .build())
                    .collect(Collectors.toList());
        }

        return AdminSubmissionResponse.builder()
                .attemptId(attempt.getId())
                .studentName(attempt.getUser() != null ? attempt.getUser().getName() : "Học viên ẩn danh")
                .examTitle(attempt.getExam() != null ? attempt.getExam().getTitle() : "Đề thi không xác định")
                .skill(attempt.getExam() != null && attempt.getExam().getSkill() != null ? attempt.getExam().getSkill().name() : "N/A")
                .status(attempt.getStatus() == null ? "N/A" : attempt.getStatus().name())
                .submittedAt(attempt.getSubmittedAt() != null ? attempt.getSubmittedAt() : attempt.getStartedAt())
                .bandScore(attempt.getBandScore())
                .feedback(attempt.getFeedback())
                .answers(answerDtos)
                .build();
    }
}
