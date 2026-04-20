package vn.aimhigh.aimhighbackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.aimhigh.aimhighbackend.dto.request.SaveProgressRequest;
import vn.aimhigh.aimhighbackend.dto.request.StartAttemptRequest;
import vn.aimhigh.aimhighbackend.dto.request.SubmitAttemptRequest;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;
import vn.aimhigh.aimhighbackend.dto.response.AttemptResponse;
import vn.aimhigh.aimhighbackend.dto.response.ProgressResponse;
import vn.aimhigh.aimhighbackend.dto.response.ResultResponse;
import vn.aimhigh.aimhighbackend.exception.UnauthorizedException;
import vn.aimhigh.aimhighbackend.repository.UserRepository;
import vn.aimhigh.aimhighbackend.service.AttemptService;

import java.util.List;

@RestController
@RequestMapping("/api/attempts")
@RequiredArgsConstructor
public class AttemptController {

    private final AttemptService attemptService;
    private final UserRepository userRepository;

    @PostMapping("/start")
    public ResponseEntity<ApiResponse<AttemptResponse>> startAttempt(
            @Valid @RequestBody StartAttemptRequest request,
            Authentication authentication) {
        Long userId = requireUserId(authentication);
        return ResponseEntity.ok(ApiResponse.success(attemptService.startAttempt(request, userId)));
    }

    @PostMapping("/{id}/progress")
    public ResponseEntity<ApiResponse<String>> saveProgress(
            @PathVariable Long id,
            @Valid @RequestBody SaveProgressRequest request,
            Authentication authentication) {
        Long userId = requireUserId(authentication);
        attemptService.saveProgress(id, request, userId);
        return ResponseEntity.ok(ApiResponse.success("Lưu tiến độ thành công"));
    }

    @GetMapping("/{id}/progress")
    public ResponseEntity<ApiResponse<List<ProgressResponse>>> getProgress(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = requireUserId(authentication);
        return ResponseEntity.ok(ApiResponse.success(attemptService.getProgress(id, userId)));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<ApiResponse<ResultResponse>> submitAttempt(
            @PathVariable Long id,
            @Valid @RequestBody SubmitAttemptRequest request,
            Authentication authentication) {
        Long userId = requireUserId(authentication);
        return ResponseEntity.ok(ApiResponse.success(attemptService.submitAttempt(id, request, userId)));
    }

    private Long requireUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("Bạn cần đăng nhập để thực hiện thao tác này");
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
