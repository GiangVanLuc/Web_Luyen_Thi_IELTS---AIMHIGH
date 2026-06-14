package vn.aimhigh.aimhighbackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;
import vn.aimhigh.aimhighbackend.dto.response.ExamSummaryResponse;
import vn.aimhigh.aimhighbackend.enums.AdminPermission;
import vn.aimhigh.aimhighbackend.enums.Skill;
import vn.aimhigh.aimhighbackend.model.Exam;
import vn.aimhigh.aimhighbackend.service.AdminAuthorizationService;
import vn.aimhigh.aimhighbackend.service.ExamImportService;
import vn.aimhigh.aimhighbackend.service.ExamService;

import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/admin/exams")
@RequiredArgsConstructor
public class AdminExamController {

    private final ExamImportService examImportService;
    private final ExamService examService;
    private final AdminAuthorizationService adminAuthorizationService;

    @PostMapping("/import/json")
    public ResponseEntity<ApiResponse<Exam>> importJson(
            @RequestBody JsonNode request,
            Authentication authentication) {
        adminAuthorizationService.requirePermission(authentication, AdminPermission.EXAM_IMPORT);
        return ResponseEntity.ok(ApiResponse.success(examImportService.importFromJson(request), "Import JSON thành công"));
    }

    @PostMapping("/import/excel")
    public ResponseEntity<ApiResponse<Exam>> importExcel(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        adminAuthorizationService.requirePermission(authentication, AdminPermission.EXAM_IMPORT);
        return ResponseEntity.ok(ApiResponse.success(examImportService.importFromExcel(file), "Import Excel thành công"));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ExamSummaryResponse>> createExam(
            @RequestBody JsonNode request,
            Authentication authentication) {
        adminAuthorizationService.requirePermission(authentication, AdminPermission.EXAM_CREATE);
        return ResponseEntity.ok(ApiResponse.success(examService.createAdminExam(request), "Tạo đề thi thành công"));
    }

    @GetMapping("/template/{skill}")
    public ResponseEntity<byte[]> downloadTemplate(
            @PathVariable Skill skill,
            Authentication authentication) {
        adminAuthorizationService.requirePermission(authentication, AdminPermission.EXAM_IMPORT);
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=" + skill.name().toLowerCase(Locale.ROOT) + "_template.xlsx")
                .body(examImportService.downloadTemplate(skill));
    }

    @GetMapping("/template/{skill}/full-sample")
    public ResponseEntity<byte[]> downloadFullSampleTemplate(
            @PathVariable Skill skill,
            Authentication authentication) {
        adminAuthorizationService.requirePermission(authentication, AdminPermission.EXAM_IMPORT);
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=" + skill.name().toLowerCase(Locale.ROOT) + "_full_sample.xlsx")
                .body(examImportService.downloadFullSampleTemplate(skill));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ExamSummaryResponse>>> getAllExams(
            @RequestParam(required = false) Skill skill,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            Authentication authentication) {
        adminAuthorizationService.requirePermission(authentication, AdminPermission.EXAM_VIEW);
        return ResponseEntity.ok(ApiResponse.success(examService.getAdminExams(skill, status, search)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ExamSummaryResponse>> updateExam(
            @PathVariable Long id,
            @RequestBody JsonNode request,
            Authentication authentication) {
        adminAuthorizationService.requirePermission(authentication, AdminPermission.EXAM_UPDATE);
        return ResponseEntity.ok(ApiResponse.success(examService.updateAdminExam(id, request), "Cập nhật đề thi thành công"));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<ExamSummaryResponse>> updateExamStatus(
            @PathVariable Long id,
            @RequestBody JsonNode request,
            Authentication authentication) {
        adminAuthorizationService.requirePermission(authentication, AdminPermission.EXAM_PUBLISH);
        String status = request.path("status").asText("published");
        return ResponseEntity.ok(ApiResponse.success(examService.updateAdminExamStatus(id, status), "Cập nhật trạng thái thành công"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteExam(
            @PathVariable Long id,
            Authentication authentication) {
        adminAuthorizationService.requirePermission(authentication, AdminPermission.EXAM_DELETE);
        examService.deleteAdminExam(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa đề thi thành công"));
    }
}
