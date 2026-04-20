package vn.aimhigh.aimhighbackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.aimhigh.aimhighbackend.dto.request.ChangePasswordRequest;
import vn.aimhigh.aimhighbackend.dto.request.UpdateProfileRequest;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;
import vn.aimhigh.aimhighbackend.dto.response.UserDashboardResponse;
import vn.aimhigh.aimhighbackend.dto.response.UserProfileResponse;
import vn.aimhigh.aimhighbackend.enums.AttemptStatus;
import vn.aimhigh.aimhighbackend.enums.AuthProvider;
import vn.aimhigh.aimhighbackend.exception.BadRequestException;
import vn.aimhigh.aimhighbackend.exception.UnauthorizedException;
import vn.aimhigh.aimhighbackend.model.Attempt;
import vn.aimhigh.aimhighbackend.model.User;
import vn.aimhigh.aimhighbackend.repository.AttemptRepository;
import vn.aimhigh.aimhighbackend.repository.UserRepository;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Validated
public class UserController {

    private final UserRepository userRepository;
    private final AttemptRepository attemptRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getProfile(Authentication authentication) {
        User user = requireUser(authentication);
        UserDashboardResponse stats = buildDashboardStats(user.getId());
        return ResponseEntity.ok(ApiResponse.success(toProfileResponse(user, stats)));
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            Authentication authentication) {
        User user = requireUser(authentication);

        String normalizedEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);
        if (!normalizedEmail.equalsIgnoreCase(user.getEmail()) && Boolean.TRUE.equals(userRepository.existsByEmail(normalizedEmail))) {
            throw new BadRequestException("Email đã được sử dụng bởi tài khoản khác");
        }

        String normalizedName = request.getName().trim();
        if (normalizedName.isBlank()) {
            throw new BadRequestException("Tên không được để trống");
        }

        String normalizedAvatarUrl = normalizeAvatarUrl(request.getAvatarUrl());

        user.setName(normalizedName);
        user.setEmail(normalizedEmail);
        user.setAvatarUrl(normalizedAvatarUrl);

        User savedUser = userRepository.save(user);
        UserDashboardResponse stats = buildDashboardStats(savedUser.getId());
        return ResponseEntity.ok(ApiResponse.success(toProfileResponse(savedUser, stats), "Cập nhật hồ sơ thành công"));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<UserDashboardResponse>> getDashboard(Authentication authentication) {
        User user = requireUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(buildDashboardStats(user.getId())));
    }

    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse<String>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Authentication authentication) {
        User user = requireUser(authentication);

        if (user.getAuthProvider() != AuthProvider.LOCAL || user.getPassword() == null || user.getPassword().isBlank()) {
            throw new BadRequestException("Tài khoản đăng nhập bằng Google không hỗ trợ đổi mật khẩu tại đây");
        }

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Mật khẩu hiện tại không đúng");
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new BadRequestException("Mật khẩu mới phải khác mật khẩu hiện tại");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        return ResponseEntity.ok(ApiResponse.success("Đổi mật khẩu thành công"));
    }

    private User requireUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("Bạn cần đăng nhập để sử dụng chức năng này");
        }

        String email = authentication.getName();
        if (email == null || email.isBlank()) {
            throw new UnauthorizedException("Không xác định được người dùng từ token");
        }

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("Phiên đăng nhập không hợp lệ"));
    }

    private UserDashboardResponse buildDashboardStats(Long userId) {
        List<Attempt> attempts = attemptRepository.findByUserIdOrderByStartedAtDesc(userId);

        List<Attempt> submittedAttempts = attempts.stream()
                .filter(a -> a.getStatus() == AttemptStatus.SUBMITTED)
                .toList();

        List<Double> bandScores = submittedAttempts.stream()
                .map(Attempt::getBandScore)
                .filter(Objects::nonNull)
                .toList();

        double averageBand = bandScores.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        double bestBand = bandScores.stream().mapToDouble(Double::doubleValue).max().orElse(0.0);

        return UserDashboardResponse.builder()
                .totalAttempts(attempts.size())
                .submittedAttempts(submittedAttempts.size())
                .averageBandScore(round2(averageBand))
                .bestBandScore(round2(bestBand))
                .lastPracticedAt(attempts.stream()
                        .map(Attempt::getStartedAt)
                        .filter(Objects::nonNull)
                        .max(Comparator.naturalOrder())
                        .orElse(null))
                .build();
    }

    private UserProfileResponse toProfileResponse(User user, UserDashboardResponse stats) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .authProvider(user.getAuthProvider())
                .createdAt(user.getCreatedAt())
                .stats(stats)
                .build();
    }

    private String normalizeAvatarUrl(String avatarUrl) {
        if (avatarUrl == null) {
            return null;
        }
        String normalized = avatarUrl.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
