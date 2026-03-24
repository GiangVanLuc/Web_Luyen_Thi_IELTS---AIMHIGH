package vn.aimhigh.aimhighbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.aimhigh.aimhighbackend.model.Note;
import java.util.List;

@Repository
public interface NoteRepository extends JpaRepository<Note, Long> {
    List<Note> findByAttemptId(Long attemptId);
}
