package vn.aimhigh.aimhighbackend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import vn.aimhigh.aimhighbackend.enums.Role;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {
    private String accessToken;
    private String email;
    private String name;
    private Role role;
}

