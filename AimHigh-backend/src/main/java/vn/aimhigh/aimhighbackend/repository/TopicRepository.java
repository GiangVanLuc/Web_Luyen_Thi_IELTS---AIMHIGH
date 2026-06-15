package vn.aimhigh.aimhighbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.aimhigh.aimhighbackend.model.Topic;

import java.util.List;
import java.util.Optional;

@Repository
public interface TopicRepository extends JpaRepository<Topic, Long> {
    List<Topic> findByFolderIdOrderByDisplayOrderAscNameAsc(Long folderId);

    List<Topic> findAllByOrderByDisplayOrderAscNameAsc();

    boolean existsByFolderIdAndNormalizedName(Long folderId, String normalizedName);

    Optional<Topic> findByFolderIdAndNormalizedName(Long folderId, String normalizedName);

    long countByFolderId(Long folderId);
}
