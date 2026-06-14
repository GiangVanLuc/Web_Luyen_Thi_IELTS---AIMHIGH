package vn.aimhigh.aimhighbackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.aimhigh.aimhighbackend.dto.request.AdminGradeRequest;
import vn.aimhigh.aimhighbackend.dto.response.AdminSubmissionResponse;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;
import vn.aimhigh.aimhighbackend.enums.AdminPermission;
import vn.aimhigh.aimhighbackend.service.AdminAuthorizationService;
import vn.aimhigh.aimhighbackend.service.AdminSubmissionService;

@RestController
@RequestMapping("/api/admin/submissions")
@RequiredArgsConstructor
@Validated
public class AdminSubmissionController {

    private final AdminSubmissionService adminSubmissionService;
    private final AdminAuthorizationService adminAuthorizationService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<AdminSubmissionResponse>>> getAllSubmissions(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String skill,
            Authentication authentication) {
        adminAuthorizationService.requirePermission(authentication, AdminPermission.SUBMISSION_VIEW);
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), limit, Sort.by("startedAt").descending());
        Page<AdminSubmissionResponse> result = adminSubmissionService.getSubmissions(skill, pageable);
        return ResponseEntity.ok(ApiResponse.success(result, "Lấy danh sách bài nộp thành công"));
    }

    @GetMapping("/ungraded")
    public ResponseEntity<ApiResponse<Page<AdminSubmissionResponse>>> getUngradedSubmissions(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String skill,
            Authentication authentication) {
        adminAuthorizationService.requirePermission(authentication, AdminPermission.SUBMISSION_VIEW);
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), limit, Sort.by("startedAt").descending());
        Page<AdminSubmissionResponse> result = adminSubmissionService.getUngradedSubmissions(skill, pageable);
        return ResponseEntity.ok(ApiResponse.success(result, "Lấy danh sách bài cần chấm thành công"));
    }

    @PostMapping("/{id}/grade")
    public ResponseEntity<ApiResponse<String>> gradeSubmission(
            @PathVariable Long id,
            @Valid @RequestBody AdminGradeRequest request,
            Authentication authentication) {
        adminAuthorizationService.requirePermission(authentication, AdminPermission.SUBMISSION_GRADE);
        adminSubmissionService.gradeSubmission(id, request);
        return ResponseEntity.ok(ApiResponse.success("Chấm điểm bài làm thành công"));
    }
}
