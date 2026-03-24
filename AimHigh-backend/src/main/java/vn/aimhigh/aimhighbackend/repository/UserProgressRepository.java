package vn.aimhigh.aimhighbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.aimhigh.aimhighbackend.model.UserProgress;
import vn.aimhigh.aimhighbackend.enums.Skill;
import java.util.Optional;

@Repository
public interface UserProgressRepository extends JpaRepository<UserProgress, Long> {
    Optional<UserProgress> findByUserIdAndSkill(Long userId, Skill skill);
}
