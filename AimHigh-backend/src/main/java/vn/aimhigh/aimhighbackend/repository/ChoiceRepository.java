package vn.aimhigh.aimhighbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.aimhigh.aimhighbackend.model.Choice;
import java.util.List;

@Repository
public interface ChoiceRepository extends JpaRepository<Choice, Long> {
    List<Choice> findByQuestionId(Long questionId);
}
