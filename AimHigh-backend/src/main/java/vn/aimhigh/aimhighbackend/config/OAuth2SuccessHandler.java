package vn.aimhigh.aimhighbackend.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import vn.aimhigh.aimhighbackend.model.User;
import vn.aimhigh.aimhighbackend.repository.UserRepository;
import vn.aimhigh.aimhighbackend.service.JwtService;
import vn.aimhigh.aimhighbackend.service.RedisService;
import vn.aimhigh.aimhighbackend.enums.AuthProvider;
import vn.aimhigh.aimhighbackend.enums.Role;

import java.io.IOException;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final RedisService redisService; // ✅ Thay RefreshTokenRepository

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");

        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = User.builder()
                    .email(email)
                    .name(oAuth2User.getAttribute("name"))
                    .role(Role.STUDENT)
                    .authProvider(AuthProvider.GOOGLE)
                    .providerId(oAuth2User.getAttribute("sub"))
                    .avatarUrl(oAuth2User.getAttribute("picture"))
                    .build();
            return userRepository.save(newUser);
        });

        String accessToken  = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        // ✅ Lưu vào Redis
        redisService.saveRefreshToken(user.getId(), refreshToken);

        String redirectUrl = String.format(
                "%s/oauth2_callback.html?accessToken=%s&refreshToken=%s",
                frontendUrl, accessToken, refreshToken
        );

        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }
}