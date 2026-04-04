package vn.aimhigh.aimhighbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.aimhigh.aimhighbackend.model.Highlight;

import java.util.Optional;
import java.util.List;

@Repository
public interface HighlightRepository extends JpaRepository<Highlight, Long> {

    // ✅ readingPassage (tên field) + Id → Spring tự join lấy id
    List<Highlight> findByAttemptIdAndReadingPassageId(
            Long attemptId, Long readingPassageId);

    List<Highlight> findByAttemptId(Long attemptId);

    List<Highlight> findByAttemptIdAndUserIdOrderByCreatedAtAsc(Long attemptId, Long userId);

    List<Highlight> findByAttemptIdAndReadingPassageIdAndUserIdOrderByCreatedAtAsc(
            Long attemptId, Long readingPassageId, Long userId);

    Optional<Highlight> findByIdAndUserId(Long id, Long userId);
}