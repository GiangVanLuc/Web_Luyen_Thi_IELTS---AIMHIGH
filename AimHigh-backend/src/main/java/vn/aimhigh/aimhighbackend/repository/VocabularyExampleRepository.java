package vn.aimhigh.aimhighbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.aimhigh.aimhighbackend.model.VocabularyExample;
import java.util.List;

@Repository
public interface VocabularyExampleRepository extends JpaRepository<VocabularyExample, Long> {
    List<VocabularyExample> findByVocabularyId(Long vocabId);
}
