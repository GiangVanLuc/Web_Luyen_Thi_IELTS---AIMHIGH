package vn.aimhigh.aimhighbackend.service;

import tools.jackson.databind.JsonNode;
import vn.aimhigh.aimhighbackend.dto.response.ExamSummaryResponse;
import vn.aimhigh.aimhighbackend.enums.ExamLevel;
import vn.aimhigh.aimhighbackend.enums.Skill;

import java.util.List;

public interface ExamService {
    List<ExamSummaryResponse> getExams(Skill skill, ExamLevel level);

    List<ExamSummaryResponse> getAdminExams(Skill skill, String status, String search);

    ExamSummaryResponse createAdminExam(JsonNode request);

    ExamSummaryResponse updateAdminExam(Long id, JsonNode request);

    ExamSummaryResponse updateAdminExamStatus(Long id, String status);

    void deleteAdminExam(Long id);

    Object getExamDetail(Long examId);
}
