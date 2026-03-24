package vn.aimhigh.aimhighbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.aimhigh.aimhighbackend.model.Exam;
import vn.aimhigh.aimhighbackend.enums.Skill;
import vn.aimhigh.aimhighbackend.enums.ExamLevel;
import java.util.List;

@Repository
public interface ExamRepository extends JpaRepository<Exam, Long> {
    List<Exam> findBySkillAndIsActive(Skill skill, Boolean isActive);
    List<Exam> findBySkillAndLevelAndIsActive(Skill skill, ExamLevel level, Boolean isActive);
}
