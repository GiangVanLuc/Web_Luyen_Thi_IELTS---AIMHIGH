package vn.aimhigh.aimhighbackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;
import vn.aimhigh.aimhighbackend.dto.response.UserProfileResponse;
import vn.aimhigh.aimhighbackend.enums.Role;
import vn.aimhigh.aimhighbackend.service.UserService;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<UserProfileResponse>>> getUsers(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String search) {
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), limit);
        Role userRole = null;
        if (role != null && !role.isBlank()) {
            try {
                userRole = Role.valueOf(role.toUpperCase());
            } catch (IllegalArgumentException e) {
                // ignore invalid role
            }
        }
        return ResponseEntity.ok(ApiResponse.success(userService.getUsersWithPagination(userRole, search, pageable)));
    }

    @PatchMapping("/{id}/role")
    public ResponseEntity<ApiResponse<String>> updateUserRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String roleStr = body.get("role");
        if (roleStr == null) return ResponseEntity.badRequest().body(ApiResponse.error("Role is missing", 400));
        Role newRole = Role.valueOf(roleStr.toUpperCase());
        userService.updateUserRole(id, newRole);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật vai trò thành công"));
    }

    @PatchMapping("/{id}/lock")
    public ResponseEntity<ApiResponse<String>> toggleUserLock(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body) {
        Boolean locked = body.get("locked");
        if (locked == null) return ResponseEntity.badRequest().body(ApiResponse.error("Locked status is missing", 400));
        userService.toggleUserLock(id, locked);
        return ResponseEntity.ok(ApiResponse.success(locked ? "Khóa tài khoản thành công" : "Mở khóa tài khoản thành công"));
    }
}
