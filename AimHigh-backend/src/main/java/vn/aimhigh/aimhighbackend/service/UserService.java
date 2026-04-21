package vn.aimhigh.aimhighbackend.service;

import org.springframework.security.core.Authentication;
import vn.aimhigh.aimhighbackend.dto.request.ChangePasswordRequest;
import vn.aimhigh.aimhighbackend.dto.request.UpdateProfileRequest;
import vn.aimhigh.aimhighbackend.dto.response.UserDashboardResponse;
import vn.aimhigh.aimhighbackend.dto.response.UserProfileResponse;
import vn.aimhigh.aimhighbackend.model.User;

import org.springframework.web.multipart.MultipartFile;

public interface UserService {
    User requireUser(Authentication authentication);
    UserProfileResponse getProfile(Authentication authentication);
    UserProfileResponse updateProfile(UpdateProfileRequest request, Authentication authentication);
    UserProfileResponse uploadAvatar(MultipartFile file, Authentication authentication);
    UserDashboardResponse getDashboard(Authentication authentication);
    void changePassword(ChangePasswordRequest request, Authentication authentication);
}
