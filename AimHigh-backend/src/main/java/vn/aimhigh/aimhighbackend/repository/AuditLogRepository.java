package vn.aimhigh.aimhighbackend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.aimhigh.aimhighbackend.model.AuditLog;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query("SELECT a FROM AuditLog a WHERE " +
            "(:action IS NULL OR a.action = :action) AND " +
            "(:accountEmail IS NULL OR a.accountEmail = :accountEmail) AND " +
            "(:search IS NULL OR " +
            "LOWER(a.target) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(a.ipAddress) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(a.result) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<AuditLog> findWithFilters(@Param("action") String action,
                                   @Param("accountEmail") String accountEmail,
                                   @Param("search") String search,
                                   Pageable pageable);
}
