package vn.aimhigh.aimhighbackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.aimhigh.aimhighbackend.dto.request.SaveVocabularyRequest;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;
import vn.aimhigh.aimhighbackend.dto.response.VocabularyResponse;
import vn.aimhigh.aimhighbackend.service.VocabularyService;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class VocabularyController {

    private final VocabularyService vocabularyService;

    @GetMapping("/vocabulary/lookup")
    public ResponseEntity<ApiResponse<VocabularyResponse>> lookup(@RequestParam String word) {
        Long userId = 1L;
        return ResponseEntity.ok(ApiResponse.success(vocabularyService.lookup(word, userId)));
    }

    @PostMapping("/user-vocabulary")
    public ResponseEntity<ApiResponse<String>> saveToVocabulary(
            @Valid @RequestBody SaveVocabularyRequest request) {
        Long userId = 1L;
        vocabularyService.saveToUserVocabulary(request, userId);
        return ResponseEntity.ok(ApiResponse.success("Lưu từ vựng thành công"));
    }

    @GetMapping("/user-vocabulary")
    public ResponseEntity<ApiResponse<List<VocabularyResponse>>> getMyVocabulary(
            @RequestParam(required = false, defaultValue = "false") Boolean learned) {
        Long userId = 1L;
        return ResponseEntity.ok(ApiResponse.success(vocabularyService.getUserVocabulary(userId, learned)));
    }

    @DeleteMapping("/user-vocabulary/{id}")
    public ResponseEntity<ApiResponse<String>> deleteUserVocabulary(@PathVariable Long id) {
        Long userId = 1L;
        vocabularyService.deleteUserVocabulary(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Xoá từ vựng đã lưu"));
    }
}
