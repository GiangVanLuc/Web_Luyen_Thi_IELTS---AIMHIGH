package vn.aimhigh.aimhighbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.aimhigh.aimhighbackend.model.StudyLog;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Repository
public interface StudyLogRepository extends JpaRepository<StudyLog, Long> {
    
    List<StudyLog> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    @Query("SELECT FUNCTION('DATE_FORMAT', s.createdAt, '%Y-%m-%d') as logDate, COUNT(s.id) as activityCount " +
           "FROM StudyLog s " +
           "WHERE s.user.id = :userId AND s.createdAt >= :startDate " +
           "GROUP BY FUNCTION('DATE_FORMAT', s.createdAt, '%Y-%m-%d')")
    List<Map<String, Object>> getDailyActivityCountSince(
            @Param("userId") Long userId,
            @Param("startDate") LocalDateTime startDate);
}
