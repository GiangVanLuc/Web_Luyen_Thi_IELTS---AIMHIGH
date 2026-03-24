package vn.aimhigh.aimhighbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.aimhigh.aimhighbackend.model.MatchingItem;
import java.util.List;

@Repository
public interface MatchingItemRepository extends JpaRepository<MatchingItem, Long> {
    List<MatchingItem> findByQuestionId(Long questionId);
}
