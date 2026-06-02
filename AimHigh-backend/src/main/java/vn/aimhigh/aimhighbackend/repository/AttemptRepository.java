package vn.aimhigh.aimhighbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.aimhigh.aimhighbackend.model.Attempt;
import vn.aimhigh.aimhighbackend.enums.AttemptStatus;
import vn.aimhigh.aimhighbackend.enums.Skill;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Repository
public interface AttemptRepository extends JpaRepository<Attempt, Long> {
    Optional<Attempt> findByUserIdAndExamIdAndStatus(Long userId, Long examId, AttemptStatus status);
    List<Attempt> findByUserIdOrderByStartedAtDesc(Long userId);
    Page<Attempt> findByUserIdOrderByStartedAtDesc(Long userId, Pageable pageable);
    
    long countByStatusIn(List<AttemptStatus> statuses);
    
    @org.springframework.data.jpa.repository.Query("SELECT e.skill, COUNT(a) FROM Attempt a JOIN a.exam e GROUP BY e.skill")
    List<Object[]> countAttemptsBySkill();
    
    @org.springframework.data.jpa.repository.Query("SELECT a.startedAt FROM Attempt a WHERE a.startedAt BETWEEN :start AND :end")
    List<java.time.LocalDateTime> findStartedAtBetween(@org.springframework.data.repository.query.Param("start") java.time.LocalDateTime start, @org.springframework.data.repository.query.Param("end") java.time.LocalDateTime end);
    
    Page<Attempt> findByExamSkillIn(List<Skill> skills, Pageable pageable);
    Page<Attempt> findByExamSkillInAndStatus(List<Skill> skills, AttemptStatus status, Pageable pageable);
}
