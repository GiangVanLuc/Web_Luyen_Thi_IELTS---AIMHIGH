package vn.aimhigh.aimhighbackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import vn.aimhigh.aimhighbackend.dto.response.*;
import vn.aimhigh.aimhighbackend.enums.*;
import vn.aimhigh.aimhighbackend.exception.ResourceNotFoundException;
import vn.aimhigh.aimhighbackend.model.Exam;
import vn.aimhigh.aimhighbackend.repository.ExamRepository;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExamService {
    private final ExamRepository examRepository;

    /**
     * Lấy danh sách đề thi theo điều kiện
     */
    public List<ExamSummaryResponse> getExams(Skill skill, ExamLevel level) {
        log.info("Lấy danh sách đề thi. Skill: {}, Level: {}", skill, level);
        List<Exam> exams;
        if (skill != null && level != null) {
            exams = examRepository.findBySkillAndLevelAndIsActive(skill, level, true);
        } else if (skill != null) {
            exams = examRepository.findBySkillAndIsActive(skill, true);
        } else {
            exams = examRepository.findAll();
        }

        return exams.stream().map(exam -> ExamSummaryResponse.builder()
                .id(exam.getId())
                .title(exam.getTitle())
                .skill(exam.getSkill())
                .type(exam.getType())
                .level(exam.getLevel())
                .duration(exam.getDuration())
                .description(exam.getDescription())
                .thumbnail(exam.getThumbnail())
                .totalQuestions(40) // TODO: Aggregate from DB
                .build()
        ).collect(Collectors.toList());
    }

    /**
     * Lấy chi tiết đề thi (KHÔNG trả về correctAnswer)
     */
    public ExamDetailResponse getExamDetail(Long examId) {
        log.info("Lấy chi tiết đề thi ID: {}", examId);
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đề thi"));

        return ExamDetailResponse.builder()
                .id(exam.getId())
                .title(exam.getTitle())
                .skill(exam.getSkill())
                .type(exam.getType())
                .level(exam.getLevel())
                .duration(exam.getDuration())
                // TODO: Map Parts/Passages sang DTO (Bỏ correctAnswer)
                .build();
    }
}
