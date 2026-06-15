package vn.aimhigh.aimhighbackend.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import vn.aimhigh.aimhighbackend.model.AuditLog;

public interface AuditLogService {
    Page<AuditLog> getLogs(String action, String accountEmail, String search, Pageable pageable);
    void saveLog(String accountEmail, String action, String target, String ipAddress, String result);
}
