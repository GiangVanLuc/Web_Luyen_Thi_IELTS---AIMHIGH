package vn.aimhigh.aimhighbackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import vn.aimhigh.aimhighbackend.dto.request.ChangePasswordRequest;
import vn.aimhigh.aimhighbackend.dto.request.UpdateProfileRequest;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;
import vn.aimhigh.aimhighbackend.dto.response.UserDashboardResponse;
import vn.aimhigh.aimhighbackend.dto.response.UserProfileResponse;
import vn.aimhigh.aimhighbackend.service.UserService;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Validated
public class UserController {

    private final UserService userService;

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getProfile(Authentication authentication) {
        UserProfileResponse response = userService.getProfile(authentication);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            Authentication authentication) {
        UserProfileResponse response = userService.updateProfile(request, authentication);
        return ResponseEntity.ok(ApiResponse.success(response, "Cập nhật hồ sơ thành công"));
    }

    @PostMapping(value = "/avatar", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UserProfileResponse>> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        UserProfileResponse response = userService.uploadAvatar(file, authentication);
        return ResponseEntity.ok(ApiResponse.success(response, "Cập nhật ảnh đại diện thành công"));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<UserDashboardResponse>> getDashboard(Authentication authentication) {
        UserDashboardResponse response = userService.getDashboard(authentication);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse<String>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Authentication authentication) {
        userService.changePassword(request, authentication);
        return ResponseEntity.ok(ApiResponse.success("Đổi mật khẩu thành công"));
    }
}
