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
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.JsonNode;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExamService {
    private final ExamRepository examRepository;
    private final ObjectMapper objectMapper;

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

    public Object getExamDetail(Long examId) {
        log.info("Lấy chi tiết đề thi ID: {}", examId);
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đề thi"));

        if (exam.getExamData() != null) {
            try {
                return objectMapper.readTree(exam.getExamData());
            } catch (Exception e) {
                log.error("Lỗi parse examData", e);
            }
        }

        return ExamDetailResponse.builder()
                .id(exam.getId())
                .title(exam.getTitle())
                .skill(exam.getSkill())
                .type(exam.getType())
                .level(exam.getLevel())
                .duration(exam.getDuration())
                .parts(exam.getListeningParts() == null ? null : exam.getListeningParts().stream().map(part -> 
                        ExamDetailResponse.PartDto.builder()
                                .id(part.getId())
                                .partNumber(part.getPartNumber())
                                .title(part.getTitle())
                                .audioUrl(part.getAudioUrl())
                                .audioDuration(part.getAudioDuration())
                                .questions(mapQuestions(part.getQuestions()))
                                .build()
                ).collect(Collectors.toList()))
                .passages(exam.getReadingPassages() == null ? null : exam.getReadingPassages().stream().map(passage ->
                        ExamDetailResponse.PassageDto.builder()
                                .id(passage.getId())
                                .title(passage.getTitle())
                                .content(passage.getContent())
                                .imageUrl(passage.getImageUrl())
                                .passageOrder(passage.getPassageOrder())
                                .questions(mapQuestions(passage.getQuestions()))
                                .build()
                ).collect(Collectors.toList()))
                .build();
    }

    private List<QuestionResponse> mapQuestions(List<vn.aimhigh.aimhighbackend.model.Question> questions) {
        if (questions == null) return null;
        return questions.stream().map(q -> QuestionResponse.builder()
                .id(q.getId())
                .questionNumber(q.getQuestionNumber())
                .questionText(q.getQuestionText())
                .questionType(q.getQuestionType() != null ? q.getQuestionType().getName() : null)
                .audioStart(q.getAudioStart())
                .audioEnd(q.getAudioEnd())
                .points(q.getPoints() != null ? q.getPoints() : 1.0)
                .choices(q.getChoices() == null ? null : q.getChoices().stream().map(c -> 
                        QuestionResponse.ChoiceDto.builder()
                                .id(c.getId())
                                .label(c.getChoiceLabel())
                                .text(c.getChoiceText())
                                .build()
                ).collect(Collectors.toList()))
                // Cố tình KHÔNG MAP correctAnswer và explanation để chống gian lận
                .build()
        ).collect(Collectors.toList());
    }
}
