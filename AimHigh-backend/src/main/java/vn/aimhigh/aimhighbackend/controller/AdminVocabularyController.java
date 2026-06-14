package vn.aimhigh.aimhighbackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;
import vn.aimhigh.aimhighbackend.dto.request.AdminVocabularyUpsertRequest;
import vn.aimhigh.aimhighbackend.dto.response.AdminVocabularyImportResponse;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;
import vn.aimhigh.aimhighbackend.dto.response.VocabularyResponse;
import vn.aimhigh.aimhighbackend.enums.AdminPermission;
import vn.aimhigh.aimhighbackend.service.AdminAuthorizationService;
import vn.aimhigh.aimhighbackend.service.AdminVocabularyService;

import java.util.List;

@RestController
@RequestMapping("/api/admin/vocabulary")
@RequiredArgsConstructor
public class AdminVocabularyController {

    private final AdminVocabularyService adminVocabularyService;
    private final AdminAuthorizationService adminAuthorizationService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<VocabularyResponse>>> listVocabulary(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String partOfSpeech,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            Authentication authentication) {
        adminAuthorizationService.requirePermission(authentication, AdminPermission.VOCAB_VIEW);
        List<VocabularyResponse> result = adminVocabularyService.getVocabulary(q, partOfSpeech, page, size);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<VocabularyResponse>> upsertVocabulary(
            @Valid @RequestBody AdminVocabularyUpsertRequest request,
            Authentication authentication) {
        adminAuthorizationService.requirePermission(authentication, AdminPermission.VOCAB_CREATE);
        VocabularyResponse response = adminVocabularyService.upsertVocabulary(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Lưu từ vựng thành công"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteVocabulary(
            @PathVariable Long id,
            Authentication authentication) {
        adminAuthorizationService.requirePermission(authentication, AdminPermission.VOCAB_DELETE);
        adminVocabularyService.deleteVocabulary(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa từ vựng thành công"));
    }

    @PostMapping("/import/json")
    public ResponseEntity<ApiResponse<AdminVocabularyImportResponse>> importVocabularyByJson(
            @RequestBody JsonNode payload,
            Authentication authentication) {
        adminAuthorizationService.requirePermission(authentication, AdminPermission.VOCAB_IMPORT);
        AdminVocabularyImportResponse response = adminVocabularyService.importFromJson(payload);
        return ResponseEntity.ok(ApiResponse.success(response, "Import JSON hoàn tất"));
    }

    @PostMapping(value = "/import/excel", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<AdminVocabularyImportResponse>> importVocabularyByExcel(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        adminAuthorizationService.requirePermission(authentication, AdminPermission.VOCAB_IMPORT);
        AdminVocabularyImportResponse response = adminVocabularyService.importFromExcel(file);
        return ResponseEntity.ok(ApiResponse.success(response, "Import Excel hoàn tất"));
    }
}
