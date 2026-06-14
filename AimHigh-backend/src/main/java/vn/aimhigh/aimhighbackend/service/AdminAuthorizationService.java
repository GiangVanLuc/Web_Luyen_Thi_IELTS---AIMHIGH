package vn.aimhigh.aimhighbackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import vn.aimhigh.aimhighbackend.enums.AdminPermission;
import vn.aimhigh.aimhighbackend.enums.Role;
import vn.aimhigh.aimhighbackend.exception.ForbiddenException;
import vn.aimhigh.aimhighbackend.exception.UnauthorizedException;
import vn.aimhigh.aimhighbackend.model.User;

@Service
@RequiredArgsConstructor
public class AdminAuthorizationService {

    public User requirePermission(Authentication authentication, AdminPermission permission) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            throw new UnauthorizedException("Bạn cần đăng nhập để truy cập trang quản trị");
        }

        Role role = user.getRole();
        if (role == null || !role.isAdminRole()) {
            throw new ForbiddenException("Tài khoản không có quyền quản trị");
        }

        if (!AdminPermission.defaultsFor(role).contains(permission)) {
            throw new ForbiddenException("Bạn không có quyền thực hiện thao tác này");
        }

        return user;
    }
}
