package vn.aimhigh.aimhighbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.aimhigh.aimhighbackend.model.Folder;

import java.util.List;
import java.util.Optional;

@Repository
public interface FolderRepository extends JpaRepository<Folder, Long> {
    List<Folder> findAllByOrderByDisplayOrderAscNameAsc();

    boolean existsByNormalizedName(String normalizedName);

    Optional<Folder> findByNormalizedName(String normalizedName);
}
