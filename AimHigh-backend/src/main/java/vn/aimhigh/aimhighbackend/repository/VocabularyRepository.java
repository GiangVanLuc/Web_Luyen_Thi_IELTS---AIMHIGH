package vn.aimhigh.aimhighbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.aimhigh.aimhighbackend.model.Vocabulary;
import java.util.List;
import java.util.Optional;

@Repository
public interface VocabularyRepository extends JpaRepository<Vocabulary, Long> {
    Optional<Vocabulary> findByWord(String word);
    List<Vocabulary> findByTopicId(Long topicId);
}
