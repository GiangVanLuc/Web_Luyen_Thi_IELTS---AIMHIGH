package vn.aimhigh.aimhighbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.aimhigh.aimhighbackend.model.User;
import vn.aimhigh.aimhighbackend.model.UserVocabulary;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserVocabularyRepository extends JpaRepository<UserVocabulary, Long> {
    @Query("SELECT DISTINCT uv.user FROM UserVocabulary uv WHERE uv.learnLevel < 2 AND uv.savedAt < :threshold")
    List<User> findUsersNeedingReview(@Param("threshold") LocalDateTime threshold);
    Optional<UserVocabulary> findByUserIdAndVocabularyId(Long userId, Long vocabId);

    Optional<UserVocabulary> findByUserIdAndId(Long userId, Long id);

    List<UserVocabulary> findByUserId(Long userId);

    List<UserVocabulary> findByUserIdOrderBySavedAtDesc(Long userId);

    List<UserVocabulary> findByUserIdAndGroupId(Long userId, Long groupId);

    long countByUserIdAndGroupId(Long userId, Long groupId);

    @Query("""
        select uv from UserVocabulary uv
        join uv.vocabulary v
        left join uv.group g
        where uv.user.id = :userId
          and (:learned is null or uv.learned = :learned)
          and (:learnLevel is null or uv.learnLevel = :learnLevel)
          and (:groupId is null or g.id = :groupId)
          and (:partOfSpeech is null or lower(coalesce(v.partOfSpeech, '')) = lower(:partOfSpeech))
          and (:fromDate is null or uv.savedAt >= :fromDate)
          and (:toDate is null or uv.savedAt <= :toDate)
          and (
                :keyword is null
                or lower(v.word) like lower(concat('%', :keyword, '%'))
                or lower(coalesce(v.meaning, '')) like lower(concat('%', :keyword, '%'))
                or lower(coalesce(v.viMeaning, '')) like lower(concat('%', :keyword, '%'))
          )
    """)
    List<UserVocabulary> searchUserVocabulary(
            @Param("userId") Long userId,
            @Param("learned") Boolean learned,
            @Param("learnLevel") Integer learnLevel,
            @Param("groupId") Long groupId,
            @Param("partOfSpeech") String partOfSpeech,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate,
            @Param("keyword") String keyword
    );
}
