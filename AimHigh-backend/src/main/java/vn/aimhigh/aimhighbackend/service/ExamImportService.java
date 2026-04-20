package vn.aimhigh.aimhighbackend.service;

import tools.jackson.databind.JsonNode;
import org.springframework.web.multipart.MultipartFile;
import vn.aimhigh.aimhighbackend.enums.Skill;
import vn.aimhigh.aimhighbackend.model.Exam;

public interface ExamImportService {
    Exam importFromJson(JsonNode rootNode);

    Exam importFromExcel(MultipartFile file);

    byte[] downloadTemplate(Skill skill);

    byte[] downloadFullSampleTemplate(Skill skill);
}
