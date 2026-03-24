package vn.aimhigh.aimhighbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.aimhigh.aimhighbackend.model.QuestionType;

@Repository
public interface QuestionTypeRepository extends JpaRepository<QuestionType, Long> {
}
