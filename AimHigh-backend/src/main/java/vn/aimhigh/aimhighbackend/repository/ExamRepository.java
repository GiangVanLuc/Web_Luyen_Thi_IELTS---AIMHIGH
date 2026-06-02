package vn.aimhigh.aimhighbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.aimhigh.aimhighbackend.model.Exam;
import vn.aimhigh.aimhighbackend.enums.ExamStatus;
import vn.aimhigh.aimhighbackend.enums.Skill;
import vn.aimhigh.aimhighbackend.enums.ExamLevel;
import java.util.List;

@Repository
public interface ExamRepository extends JpaRepository<Exam, Long> {
    List<Exam> findByStatus(ExamStatus status);
    List<Exam> findBySkillAndStatus(Skill skill, ExamStatus status);
    List<Exam> findBySkillAndLevelAndStatus(Skill skill, ExamLevel level, ExamStatus status);
    boolean existsByTitleAndSkill(String title, Skill skill);
}
