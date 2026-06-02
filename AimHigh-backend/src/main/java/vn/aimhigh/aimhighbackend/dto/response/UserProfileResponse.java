package vn.aimhigh.aimhighbackend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import vn.aimhigh.aimhighbackend.enums.AuthProvider;
import vn.aimhigh.aimhighbackend.enums.Role;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private Long id;
    private String name;
    private String email;
    private String avatarUrl;
    private Role role;
    private AuthProvider authProvider;
    private LocalDateTime createdAt;
    private Boolean isLocked;
    private UserDashboardResponse stats;
}
