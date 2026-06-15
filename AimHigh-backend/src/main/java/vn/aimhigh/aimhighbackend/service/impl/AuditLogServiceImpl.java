package vn.aimhigh.aimhighbackend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.aimhigh.aimhighbackend.model.AuditLog;
import vn.aimhigh.aimhighbackend.repository.AuditLogRepository;
import vn.aimhigh.aimhighbackend.service.AuditLogService;

@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLog> getLogs(String action, String accountEmail, String search, Pageable pageable) {
        if (action != null && action.isBlank()) action = null;
        if (accountEmail != null && accountEmail.isBlank()) accountEmail = null;
        if (search != null && search.isBlank()) search = null;

        return auditLogRepository.findWithFilters(action, accountEmail, search, pageable);
    }

    @Override
    @Transactional
    public void saveLog(String accountEmail, String action, String target, String ipAddress, String result) {
        AuditLog log = AuditLog.builder()
                .accountEmail(accountEmail)
                .action(action)
                .target(target)
                .ipAddress(ipAddress)
                .result(result)
                .build();
        auditLogRepository.save(log);
    }
}
