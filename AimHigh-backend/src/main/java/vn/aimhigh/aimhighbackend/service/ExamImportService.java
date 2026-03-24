package vn.aimhigh.aimhighbackend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import vn.aimhigh.aimhighbackend.enums.Skill;
import vn.aimhigh.aimhighbackend.model.Exam;

@Slf4j
@Service
public class ExamImportService {
    public Exam importFromJson(MultipartFile file) {
        log.info("Tiến hành import JSON...");
        return new Exam();
    }

    public Exam importFromExcel(MultipartFile file) {
        log.info("Tiến hành import Excel bằng POI...");
        return new Exam();
    }

    public byte[] downloadTemplate(Skill skill) {
        return new byte[0];
    }
}
