package vn.aimhigh.aimhighbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.aimhigh.aimhighbackend.model.ReadingPassage;
import java.util.List;

@Repository
public interface ReadingPassageRepository extends JpaRepository<ReadingPassage, Long> {
    List<ReadingPassage> findByExamIdOrderBySectionNumberAscPassageOrderInSectionAscIdAsc(Long examId);
    List<ReadingPassage> findByExamIdOrderByPassageOrder(Long examId);
}
