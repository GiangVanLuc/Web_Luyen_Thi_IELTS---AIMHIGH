package vn.aimhigh.aimhighbackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;
import vn.aimhigh.aimhighbackend.enums.AdminPermission;
import vn.aimhigh.aimhighbackend.model.AuditLog;
import vn.aimhigh.aimhighbackend.service.AdminAuthorizationService;
import vn.aimhigh.aimhighbackend.service.AuditLogService;

@RestController
@RequestMapping("/api/admin/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;
    private final AdminAuthorizationService adminAuthorizationService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<AuditLog>>> getAuditLogs(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String accountEmail,
            @RequestParam(required = false) String search,
            Authentication authentication) {
        
        adminAuthorizationService.requirePermission(authentication, AdminPermission.AUDIT_VIEW);
        
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), limit, Sort.by(Sort.Direction.DESC, "timestamp"));
        Page<AuditLog> logs = auditLogService.getLogs(action, accountEmail, search, pageable);
        
        return ResponseEntity.ok(ApiResponse.success(logs));
    }
}
