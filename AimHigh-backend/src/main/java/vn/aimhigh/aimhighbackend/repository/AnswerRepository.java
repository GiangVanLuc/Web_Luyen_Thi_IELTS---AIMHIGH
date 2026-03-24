package vn.aimhigh.aimhighbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.aimhigh.aimhighbackend.model.Answer;
import java.util.List;

@Repository
public interface AnswerRepository extends JpaRepository<Answer, Long> {
    List<Answer> findByAttemptId(Long attemptId);
}
