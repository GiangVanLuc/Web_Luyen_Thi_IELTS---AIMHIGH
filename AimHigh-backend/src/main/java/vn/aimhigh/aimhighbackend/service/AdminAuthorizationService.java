package vn.aimhigh.aimhighbackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import vn.aimhigh.aimhighbackend.enums.AdminPermission;
import vn.aimhigh.aimhighbackend.enums.Role;
import vn.aimhigh.aimhighbackend.exception.ForbiddenException;
import vn.aimhigh.aimhighbackend.exception.UnauthorizedException;
import vn.aimhigh.aimhighbackend.model.User;
import vn.aimhigh.aimhighbackend.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class AdminAuthorizationService {

    private final UserRepository userRepository;

    public User requirePermission(Authentication authentication, AdminPermission permission) {
        User user = resolveCurrentUser(authentication);

        Role role = user.getRole();
        if (role == null || !role.isAdminRole()) {
            throw new ForbiddenException("Tài khoản không có quyền quản trị");
        }

        if (!AdminPermission.defaultsFor(role).contains(permission)) {
            throw new ForbiddenException("Bạn không có quyền thực hiện thao tác này");
        }

        return user;
    }

    /**
     * Lấy User hiện tại từ Authentication. Với JWT resource server, principal là đối tượng Jwt
     * còn authentication.getName() trả về subject (email). Trường hợp đăng nhập qua UserDetails
     * thì principal đã là User — hỗ trợ cả hai để an toàn.
     */
    private User resolveCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("Bạn cần đăng nhập để truy cập trang quản trị");
        }

        if (authentication.getPrincipal() instanceof User user) {
            return user;
        }

        String email = authentication.getName();
        if (email == null || email.isBlank()) {
            throw new UnauthorizedException("Bạn cần đăng nhập để truy cập trang quản trị");
        }

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("Phiên đăng nhập không hợp lệ"));
    }
}
