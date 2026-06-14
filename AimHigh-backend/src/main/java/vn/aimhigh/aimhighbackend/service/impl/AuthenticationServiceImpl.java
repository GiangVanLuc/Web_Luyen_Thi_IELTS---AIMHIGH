package vn.aimhigh.aimhighbackend.service.impl;

import vn.aimhigh.aimhighbackend.service.JwtService;
import vn.aimhigh.aimhighbackend.service.AuthenticationService;
import vn.aimhigh.aimhighbackend.service.RedisService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import vn.aimhigh.aimhighbackend.dto.request.LoginRequest;
import vn.aimhigh.aimhighbackend.dto.request.RegisterRequest;
import vn.aimhigh.aimhighbackend.dto.response.AuthResponse;
import vn.aimhigh.aimhighbackend.dto.response.LoginResponse;
import vn.aimhigh.aimhighbackend.enums.AuthProvider;
import vn.aimhigh.aimhighbackend.enums.Role;
import vn.aimhigh.aimhighbackend.exception.BadRequestException;

import vn.aimhigh.aimhighbackend.model.User;

import vn.aimhigh.aimhighbackend.repository.UserRepository;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthenticationServiceImpl implements AuthenticationService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RedisService redisService; // âœ… ThÃªm - bá» RefreshTokenRepository

    @Value("${app.jwt.expiration-ms:1800000}")
    private long accessTokenExpirationMs;

    // ÄÄƒng kÃ½ báº±ng email
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng!");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .role(Role.STUDENT)
                .authProvider(AuthProvider.LOCAL)
                .build();

        userRepository.save(user);

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);
        redisService.saveRefreshToken(user.getId(), refreshToken);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .email(user.getEmail())
                .name(user.getName())
                .role(user.getRole())
                .build();
    }

    // ÄÄƒng nháº­p
    public LoginResponse login(LoginRequest request) {
        Authentication authenticate = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        User user = (User) authenticate.getPrincipal();
        String accessToken  = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        // âœ… LÆ°u RefreshToken vÃ o Redis thay vÃ¬ DB
        redisService.saveRefreshToken(user.getId(), refreshToken);

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .email(user.getEmail())
                .name(user.getName())
                .role(user.getRole())
                .build();
    }

    // LÃ m má»›i AccessToken
    public LoginResponse refreshToken(String refreshToken) {
        // Láº¥y email tá»« token
        String email = jwtService.extractEmail(refreshToken);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User khÃ´ng tá»“n táº¡i!"));

        if (Boolean.TRUE.equals(user.getIsLocked())) {
            throw new BadRequestException("Tài khoản đã bị khóa");
        }

        // âœ… Verify token tá»« Redis
        String storedToken = redisService.getRefreshToken(user.getId());
        if (storedToken == null || !storedToken.equals(refreshToken)) {
            throw new RuntimeException("Refresh token khÃ´ng há»£p lá»‡!");
        }

        if (!jwtService.verifyToken(refreshToken)) {
            throw new RuntimeException("Refresh token Ä‘Ã£ háº¿t háº¡n!");
        }

        String newAccessToken = jwtService.generateAccessToken(user);

        return LoginResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(refreshToken)
                .email(user.getEmail())
                .name(user.getName())
                .role(user.getRole())
                .build();
    }

    // ÄÄƒng xuáº¥t
    public void logout(String refreshToken, String accessToken) {
        String email = jwtService.extractEmail(refreshToken);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User khÃ´ng tá»“n táº¡i!"));

        // âœ… Blacklist AccessToken
        redisService.blacklistToken(accessToken, accessTokenExpirationMs);

        // âœ… XÃ³a RefreshToken khá»i Redis
        redisService.deleteRefreshToken(user.getId());
    }
}


