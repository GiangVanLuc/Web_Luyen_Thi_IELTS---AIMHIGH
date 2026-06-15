package vn.aimhigh.aimhighbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.aimhigh.aimhighbackend.model.Vocabulary;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Optional;

@Repository
public interface VocabularyRepository extends JpaRepository<Vocabulary, Long> {
    Optional<Vocabulary> findByNormalizedWord(String normalizedWord);

    Optional<Vocabulary> findByWord(String word);

    List<Vocabulary> findByTopicId(Long topicId);

    long countByTopicId(Long topicId);

    @Query("""
        select v from Vocabulary v
        where (:keyword is null
                or lower(v.word) like lower(concat('%', :keyword, '%'))
                or lower(coalesce(v.meaning, '')) like lower(concat('%', :keyword, '%'))
                or lower(coalesce(v.viMeaning, '')) like lower(concat('%', :keyword, '%')))
          and (:partOfSpeech is null or lower(coalesce(v.partOfSpeech, '')) = lower(:partOfSpeech))
          and (:topicId is null or v.topic.id = :topicId)
    """)
    Page<Vocabulary> searchVocabulary(
            @Param("keyword") String keyword,
            @Param("partOfSpeech") String partOfSpeech,
            @Param("topicId") Long topicId,
            Pageable pageable
    );
}
