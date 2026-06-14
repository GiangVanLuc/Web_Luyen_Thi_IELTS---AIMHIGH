package vn.aimhigh.aimhighbackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.aimhigh.aimhighbackend.dto.request.CustomVocabularyRequest;
import vn.aimhigh.aimhighbackend.dto.request.SaveVocabularyRequest;
import vn.aimhigh.aimhighbackend.dto.request.UserVocabularyBatchDeleteRequest;
import vn.aimhigh.aimhighbackend.dto.request.UserVocabularyBatchSaveRequest;
import vn.aimhigh.aimhighbackend.dto.request.UserVocabularyBatchStatusRequest;
import vn.aimhigh.aimhighbackend.dto.request.UserVocabularyGroupCreateRequest;
import vn.aimhigh.aimhighbackend.dto.request.UserVocabularyGroupUpdateRequest;
import vn.aimhigh.aimhighbackend.dto.request.UserVocabularyStatusUpdateRequest;
import vn.aimhigh.aimhighbackend.dto.request.UserVocabularyUpdateRequest;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;
import vn.aimhigh.aimhighbackend.dto.response.UserVocabularyBatchResultResponse;
import vn.aimhigh.aimhighbackend.dto.response.UserVocabularyGroupResponse;
import vn.aimhigh.aimhighbackend.dto.response.VocabularyResponse;
import vn.aimhigh.aimhighbackend.exception.UnauthorizedException;
import vn.aimhigh.aimhighbackend.service.UserService;
import vn.aimhigh.aimhighbackend.service.VocabularyService;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class VocabularyController {

    private final VocabularyService vocabularyService;
    private final UserService userService;

    @GetMapping("/vocabulary/lookup")
    public ResponseEntity<ApiResponse<VocabularyResponse>> lookup(
            @RequestParam String word,
            Authentication authentication) {
        Long userId = userService.requireUser(authentication).getId();
        return ResponseEntity.ok(ApiResponse.success(vocabularyService.lookup(word, userId)));
    }

    @GetMapping("/vocabulary")
    public ResponseEntity<ApiResponse<List<VocabularyResponse>>> getGlobalVocabulary(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String partOfSpeech,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            Authentication authentication) {
        Long userId = userService.requireUser(authentication).getId();
        return ResponseEntity.ok(ApiResponse.success(vocabularyService.getGlobalVocabulary(q, partOfSpeech, page, size, userId)));
    }

    @PostMapping("/user-vocabulary")
    public ResponseEntity<ApiResponse<VocabularyResponse>> saveToVocabulary(
            @Valid @RequestBody SaveVocabularyRequest request,
            Authentication authentication) {
        Long userId = userService.requireUser(authentication).getId();
        VocabularyResponse response = vocabularyService.saveToUserVocabulary(request, userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Lưu từ vựng thành công"));
    }

    @PostMapping("/user-vocabulary/custom")
    public ResponseEntity<ApiResponse<VocabularyResponse>> saveCustomVocabulary(
            @Valid @RequestBody CustomVocabularyRequest request,
            Authentication authentication) {
        Long userId = userService.requireUser(authentication).getId();
        VocabularyResponse response = vocabularyService.saveCustomVocabulary(request, userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Lưu từ vựng cá nhân thành công"));
    }

    @GetMapping("/user-vocabulary")
    public ResponseEntity<ApiResponse<List<VocabularyResponse>>> getMyVocabulary(
            @RequestParam(required = false) Boolean learned,
            @RequestParam(required = false) Long groupId,
            @RequestParam(required = false) String partOfSpeech,
            @RequestParam(required = false) Integer learnLevel,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            Authentication authentication) {
        Long userId = userService.requireUser(authentication).getId();
        return ResponseEntity.ok(ApiResponse.success(vocabularyService.getUserVocabulary(
                userId,
                learned,
                groupId,
                partOfSpeech,
                learnLevel,
                fromDate,
                toDate,
                q,
                sort,
                page,
                size
        )));
    }

    @DeleteMapping("/user-vocabulary/{id}")
    public ResponseEntity<ApiResponse<String>> deleteUserVocabulary(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = userService.requireUser(authentication).getId();
        vocabularyService.deleteUserVocabulary(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Xoá từ vựng đã lưu"));
    }

    @PatchMapping("/user-vocabulary/{id}/status")
    public ResponseEntity<ApiResponse<VocabularyResponse>> updateUserVocabularyStatus(
            @PathVariable Long id,
            @Valid @RequestBody UserVocabularyStatusUpdateRequest request,
            Authentication authentication) {
        Long userId = userService.requireUser(authentication).getId();
        VocabularyResponse response = vocabularyService.updateUserVocabularyStatus(id, request.getLearnLevel(), userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Cập nhật trạng thái thành công"));
    }

    @PatchMapping("/user-vocabulary/{id}")
    public ResponseEntity<ApiResponse<VocabularyResponse>> updateUserVocabulary(
            @PathVariable Long id,
            @Valid @RequestBody UserVocabularyUpdateRequest request,
            Authentication authentication) {
        Long userId = userService.requireUser(authentication).getId();
        VocabularyResponse response = vocabularyService.updateUserVocabulary(id, request, userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Cập nhật từ vựng thành công"));
    }

    @PostMapping("/user-vocabulary/batch-save")
    public ResponseEntity<ApiResponse<UserVocabularyBatchResultResponse>> batchSaveUserVocabulary(
            @Valid @RequestBody UserVocabularyBatchSaveRequest request,
            Authentication authentication) {
        Long userId = userService.requireUser(authentication).getId();
        UserVocabularyBatchResultResponse response = vocabularyService.batchSaveToUserVocabulary(request, userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Lưu hàng loạt thành công"));
    }

    @PatchMapping("/user-vocabulary/batch-status")
    public ResponseEntity<ApiResponse<UserVocabularyBatchResultResponse>> batchUpdateUserVocabularyStatus(
            @Valid @RequestBody UserVocabularyBatchStatusRequest request,
            Authentication authentication) {
        Long userId = userService.requireUser(authentication).getId();
        UserVocabularyBatchResultResponse response = vocabularyService.batchUpdateStatus(request, userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Cập nhật trạng thái hàng loạt thành công"));
    }

    @PostMapping("/user-vocabulary/batch-delete")
    public ResponseEntity<ApiResponse<UserVocabularyBatchResultResponse>> batchDeleteUserVocabulary(
            @Valid @RequestBody UserVocabularyBatchDeleteRequest request,
            Authentication authentication) {
        Long userId = userService.requireUser(authentication).getId();
        UserVocabularyBatchResultResponse response = vocabularyService.batchDelete(request, userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Xoá hàng loạt thành công"));
    }

    @GetMapping("/user-vocabulary-groups")
    public ResponseEntity<ApiResponse<List<UserVocabularyGroupResponse>>> getUserVocabularyGroups(Authentication authentication) {
        Long userId = userService.requireUser(authentication).getId();
        return ResponseEntity.ok(ApiResponse.success(vocabularyService.getUserVocabularyGroups(userId)));
    }

    @PostMapping("/user-vocabulary-groups")
    public ResponseEntity<ApiResponse<UserVocabularyGroupResponse>> createUserVocabularyGroup(
            @Valid @RequestBody UserVocabularyGroupCreateRequest request,
            Authentication authentication) {
        Long userId = userService.requireUser(authentication).getId();
        UserVocabularyGroupResponse response = vocabularyService.createUserVocabularyGroup(request, userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Tạo nhóm từ vựng thành công"));
    }

    @PatchMapping("/user-vocabulary-groups/{groupId}")
    public ResponseEntity<ApiResponse<UserVocabularyGroupResponse>> renameUserVocabularyGroup(
            @PathVariable Long groupId,
            @Valid @RequestBody UserVocabularyGroupUpdateRequest request,
            Authentication authentication) {
        Long userId = userService.requireUser(authentication).getId();
        UserVocabularyGroupResponse response = vocabularyService.renameUserVocabularyGroup(groupId, request, userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Đổi tên nhóm thành công"));
    }

    @DeleteMapping("/user-vocabulary-groups/{groupId}")
    public ResponseEntity<ApiResponse<String>> deleteUserVocabularyGroup(
            @PathVariable Long groupId,
            Authentication authentication) {
        Long userId = userService.requireUser(authentication).getId();
        vocabularyService.deleteUserVocabularyGroup(groupId, userId);
        return ResponseEntity.ok(ApiResponse.success("Xoá nhóm từ vựng thành công"));
    }
}
