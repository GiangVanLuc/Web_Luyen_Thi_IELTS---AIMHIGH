package vn.aimhigh.aimhighbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.aimhigh.aimhighbackend.model.Question;
import java.util.List;

@Repository
public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByListeningPartIdOrderByQuestionOrder(Long partId);
    List<Question> findByReadingPassageIdOrderByQuestionOrder(Long passageId);
    List<Question> findByExamIdOrderByQuestionNumber(Long examId);
    java.util.Optional<Question> findByExamIdAndQuestionNumber(Long examId, Integer questionNumber);
}
