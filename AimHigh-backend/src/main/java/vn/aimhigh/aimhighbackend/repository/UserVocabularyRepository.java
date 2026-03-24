package vn.aimhigh.aimhighbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.aimhigh.aimhighbackend.model.UserVocabulary;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserVocabularyRepository extends JpaRepository<UserVocabulary, Long> {
    Optional<UserVocabulary> findByUserIdAndVocabularyId(Long userId, Long vocabId);
    List<UserVocabulary> findByUserId(Long userId);
}
