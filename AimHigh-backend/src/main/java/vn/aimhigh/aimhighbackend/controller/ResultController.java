package vn.aimhigh.aimhighbackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;
import vn.aimhigh.aimhighbackend.dto.response.AttemptResponse;
import vn.aimhigh.aimhighbackend.dto.response.ResultResponse;
import vn.aimhigh.aimhighbackend.exception.UnauthorizedException;
import vn.aimhigh.aimhighbackend.repository.UserRepository;
import vn.aimhigh.aimhighbackend.service.ResultService;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ResultController {

    private final ResultService resultService;
    private final UserRepository userRepository;

    @GetMapping("/attempts/{id}/result")
    public ResponseEntity<ApiResponse<ResultResponse>> getResult(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = requireUserId(authentication);
        return ResponseEntity.ok(ApiResponse.success(resultService.getResult(id, userId)));
    }

    @GetMapping("/users/me/attempts")
    public ResponseEntity<ApiResponse<List<AttemptResponse>>> getMyAttempts(Authentication authentication) {
        Long userId = requireUserId(authentication);
        return ResponseEntity.ok(ApiResponse.success(resultService.getMyAttempts(userId)));
    }

    private Long requireUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("Bạn cần đăng nhập để xem kết quả");
        }

        String email = authentication.getName();
        if (email == null || email.isBlank()) {
            throw new UnauthorizedException("Không xác định được người dùng từ token");
        }

        return userRepository.findByEmail(email)
                .map(vn.aimhigh.aimhighbackend.model.User::getId)
                .orElseThrow(() -> new UnauthorizedException("Phiên đăng nhập không hợp lệ"));
    }
}
