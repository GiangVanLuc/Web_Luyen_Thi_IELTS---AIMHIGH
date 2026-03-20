package vn.aimhigh.aimhighbackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import vn.aimhigh.aimhighbackend.enums.AuthProvider;
import vn.aimhigh.aimhighbackend.enums.Role;
import vn.aimhigh.aimhighbackend.model.User;
import vn.aimhigh.aimhighbackend.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest request)
            throws OAuth2AuthenticationException {

        OAuth2User oAuth2User = super.loadUser(request);

        // Lấy thông tin từ Google
        String email      = oAuth2User.getAttribute("email");
        String name       = oAuth2User.getAttribute("name");
        String providerId = oAuth2User.getAttribute("sub"); //  Dùng providerId
        String avatar     = oAuth2User.getAttribute("picture");

        // Tìm user theo email
        userRepository.findByEmail(email).ifPresentOrElse(
                existingUser -> {
                    // Cập nhật thông tin mới nhất
                    existingUser.setName(name);
                    existingUser.setAvatarUrl(avatar);
                    existingUser.setProviderId(providerId); //  Không dùng googleId
                    userRepository.save(existingUser);
                },
                () -> {
                    // Tạo user mới
                    User newUser = User.builder()
                            .email(email)
                            .name(name)
                            .providerId(providerId) //  Không dùng googleId
                            .avatarUrl(avatar)
                            .authProvider(AuthProvider.GOOGLE)
                            .role(Role.STUDENT)
                            .build();
                    userRepository.save(newUser);
                }
        );

        return oAuth2User;
    }
}