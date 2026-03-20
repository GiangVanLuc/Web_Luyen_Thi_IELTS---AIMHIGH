package vn.aimhigh.aimhighbackend.dto.response;


import lombok.*;
import vn.aimhigh.aimhighbackend.enums.Role;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginResponse {
    private String accessToken;
    private String refreshToken;
    private String email;
    private String name;
    private Role role;
}
