package vn.aimhigh.aimhighbackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.aimhigh.aimhighbackend.dto.request.SaveVocabularyRequest;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;
import vn.aimhigh.aimhighbackend.dto.response.VocabularyResponse;
import vn.aimhigh.aimhighbackend.exception.UnauthorizedException;
import vn.aimhigh.aimhighbackend.repository.UserRepository;
import vn.aimhigh.aimhighbackend.service.VocabularyService;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class VocabularyController {

    private final VocabularyService vocabularyService;
    private final UserRepository userRepository;

    @GetMapping("/vocabulary/lookup")
    public ResponseEntity<ApiResponse<VocabularyResponse>> lookup(
            @RequestParam String word,
            Authentication authentication) {
        Long userId = requireUserId(authentication);
        return ResponseEntity.ok(ApiResponse.success(vocabularyService.lookup(word, userId)));
    }

    @PostMapping("/user-vocabulary")
    public ResponseEntity<ApiResponse<String>> saveToVocabulary(
            @Valid @RequestBody SaveVocabularyRequest request,
            Authentication authentication) {
        Long userId = requireUserId(authentication);
        vocabularyService.saveToUserVocabulary(request, userId);
        return ResponseEntity.ok(ApiResponse.success("Lưu từ vựng thành công"));
    }

    @GetMapping("/user-vocabulary")
    public ResponseEntity<ApiResponse<List<VocabularyResponse>>> getMyVocabulary(
            @RequestParam(required = false) Boolean learned,
            Authentication authentication) {
        Long userId = requireUserId(authentication);
        return ResponseEntity.ok(ApiResponse.success(vocabularyService.getUserVocabulary(userId, learned)));
    }

    @DeleteMapping("/user-vocabulary/{id}")
    public ResponseEntity<ApiResponse<String>> deleteUserVocabulary(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = requireUserId(authentication);
        vocabularyService.deleteUserVocabulary(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Xoá từ vựng đã lưu"));
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
