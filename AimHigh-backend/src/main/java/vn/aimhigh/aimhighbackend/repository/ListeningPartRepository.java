package vn.aimhigh.aimhighbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.aimhigh.aimhighbackend.model.ListeningPart;
import java.util.List;

@Repository
public interface ListeningPartRepository extends JpaRepository<ListeningPart, Long> {
    List<ListeningPart> findByExamIdOrderByPartOrder(Long examId);
}
