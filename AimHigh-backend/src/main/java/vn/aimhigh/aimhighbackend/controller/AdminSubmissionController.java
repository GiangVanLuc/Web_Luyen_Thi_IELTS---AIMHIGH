package vn.aimhigh.aimhighbackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import vn.aimhigh.aimhighbackend.dto.request.AdminGradeRequest;
import vn.aimhigh.aimhighbackend.dto.response.AdminSubmissionResponse;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;
import vn.aimhigh.aimhighbackend.service.AdminSubmissionService;

@Slf4j
@RestController
@RequestMapping("/api/admin/submissions")
@RequiredArgsConstructor
@Validated
public class AdminSubmissionController {

    private final AdminSubmissionService adminSubmissionService;

    @GetMapping("/ungraded")
    public ResponseEntity<ApiResponse<Page<AdminSubmissionResponse>>> getSubmissions(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String skill) {
        
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), limit, Sort.by("startedAt").descending());
        Page<AdminSubmissionResponse> result = adminSubmissionService.getSubmissions(skill, pageable);
        return ResponseEntity.ok(ApiResponse.success(result, "Lấy danh sách bài thi tự luận thành công"));
    }

    @PostMapping("/{id}/grade")
    public ResponseEntity<ApiResponse<String>> gradeSubmission(
            @PathVariable Long id,
            @Valid @RequestBody AdminGradeRequest request) {
        
        adminSubmissionService.gradeSubmission(id, request);
        return ResponseEntity.ok(ApiResponse.success("Chấm điểm bài làm thành công"));
    }
}
