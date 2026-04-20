package vn.aimhigh.aimhighbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.aimhigh.aimhighbackend.model.UserVocabularyGroup;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserVocabularyGroupRepository extends JpaRepository<UserVocabularyGroup, Long> {
    List<UserVocabularyGroup> findByUserIdOrderByCreatedAtAsc(Long userId);

    Optional<UserVocabularyGroup> findByUserIdAndId(Long userId, Long groupId);

    Optional<UserVocabularyGroup> findByUserIdAndNormalizedName(Long userId, String normalizedName);

    boolean existsByUserIdAndNormalizedName(Long userId, String normalizedName);
}
