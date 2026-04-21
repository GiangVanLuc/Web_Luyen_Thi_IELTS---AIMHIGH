package vn.aimhigh.aimhighbackend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.aimhigh.aimhighbackend.dto.request.ChangePasswordRequest;
import vn.aimhigh.aimhighbackend.dto.request.UpdateProfileRequest;
import vn.aimhigh.aimhighbackend.dto.response.MediaUploadResponse;
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
import vn.aimhigh.aimhighbackend.service.MediaStorageService;
import vn.aimhigh.aimhighbackend.service.UserService;
import org.springframework.web.multipart.MultipartFile;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final AttemptRepository attemptRepository;
    private final PasswordEncoder passwordEncoder;
    private final MediaStorageService mediaStorageService;

    @Override
    public User requireUser(Authentication authentication) {
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

    @Override
    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(Authentication authentication) {
        User user = requireUser(authentication);
        UserDashboardResponse stats = buildDashboardStats(user.getId());
        return toProfileResponse(user, stats);
    }

    @Override
    @Transactional
    public UserProfileResponse updateProfile(UpdateProfileRequest request, Authentication authentication) {
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
        
        return toProfileResponse(savedUser, stats);
    }

    @Override
    @Transactional
    public UserProfileResponse uploadAvatar(MultipartFile file, Authentication authentication) {
        User user = requireUser(authentication);
        MediaUploadResponse mediaResponse = mediaStorageService.upload(file, "image");
        user.setAvatarUrl(mediaResponse.getUrl());
        User savedUser = userRepository.save(user);
        UserDashboardResponse stats = buildDashboardStats(savedUser.getId());
        return toProfileResponse(savedUser, stats);
    }

    @Override
    @Transactional(readOnly = true)
    public UserDashboardResponse getDashboard(Authentication authentication) {
        User user = requireUser(authentication);
        return buildDashboardStats(user.getId());
    }

    @Override
    @Transactional
    public void changePassword(ChangePasswordRequest request, Authentication authentication) {
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
