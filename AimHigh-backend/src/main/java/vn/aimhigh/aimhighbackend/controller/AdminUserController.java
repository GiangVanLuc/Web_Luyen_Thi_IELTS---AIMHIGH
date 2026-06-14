package vn.aimhigh.aimhighbackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;
import vn.aimhigh.aimhighbackend.dto.response.UserProfileResponse;
import vn.aimhigh.aimhighbackend.enums.AdminPermission;
import vn.aimhigh.aimhighbackend.enums.Role;
import vn.aimhigh.aimhighbackend.exception.BadRequestException;
import vn.aimhigh.aimhighbackend.service.AdminAuthorizationService;
import vn.aimhigh.aimhighbackend.service.UserService;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserService userService;
    private final AdminAuthorizationService adminAuthorizationService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<UserProfileResponse>>> getUsers(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String search,
            Authentication authentication) {
        adminAuthorizationService.requirePermission(authentication, AdminPermission.USER_VIEW);
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), limit);
        Role userRole = parseRoleOrNull(role);
        return ResponseEntity.ok(ApiResponse.success(userService.getUsersWithPagination(userRole, search, pageable)));
    }

    @PatchMapping("/{id}/role")
    public ResponseEntity<ApiResponse<String>> updateUserRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        adminAuthorizationService.requirePermission(authentication, AdminPermission.USER_UPDATE_ROLE);
        String roleStr = body.get("role");
        if (roleStr == null || roleStr.isBlank()) {
            throw new BadRequestException("Thiếu vai trò mới");
        }
        userService.updateUserRole(id, Role.valueOf(roleStr.toUpperCase()));
        return ResponseEntity.ok(ApiResponse.success("Cập nhật vai trò thành công"));
    }

    @PatchMapping("/{id}/lock")
    public ResponseEntity<ApiResponse<String>> toggleUserLock(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body,
            Authentication authentication) {
        adminAuthorizationService.requirePermission(authentication, AdminPermission.USER_LOCK);
        Boolean locked = body.get("locked");
        if (locked == null) {
            throw new BadRequestException("Thiếu trạng thái khóa tài khoản");
        }
        userService.toggleUserLock(id, locked);
        return ResponseEntity.ok(ApiResponse.success(locked ? "Khóa tài khoản thành công" : "Mở khóa tài khoản thành công"));
    }

    private Role parseRoleOrNull(String role) {
        if (role == null || role.isBlank()) {
            return null;
        }
        try {
            return Role.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }
}
