package vn.aimhigh.aimhighbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.aimhigh.aimhighbackend.model.Attempt;
import vn.aimhigh.aimhighbackend.enums.AttemptStatus;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttemptRepository extends JpaRepository<Attempt, Long> {
    Optional<Attempt> findByUserIdAndExamIdAndStatus(Long userId, Long examId, AttemptStatus status);
    List<Attempt> findByUserIdOrderByStartedAtDesc(Long userId);
}
