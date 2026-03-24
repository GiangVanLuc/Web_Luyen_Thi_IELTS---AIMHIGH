package vn.aimhigh.aimhighbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.aimhigh.aimhighbackend.model.MapLabel;
import java.util.List;

@Repository
public interface MapLabelRepository extends JpaRepository<MapLabel, Long> {
    List<MapLabel> findByQuestionId(Long questionId);
}
