package vn.aimhigh.aimhighbackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;
import vn.aimhigh.aimhighbackend.dto.response.ExamSummaryResponse;
import vn.aimhigh.aimhighbackend.enums.Skill;
import vn.aimhigh.aimhighbackend.model.Exam;
import vn.aimhigh.aimhighbackend.service.ExamService;
import vn.aimhigh.aimhighbackend.service.ExamImportService;

import java.util.List;

@RestController
@RequestMapping("/api/admin/exams")
@RequiredArgsConstructor
public class AdminExamController {

    private final ExamImportService examImportService;
    private final ExamService examService;

    @PostMapping("/import/json")
    public ResponseEntity<ApiResponse<Exam>> importJson(
            @RequestBody JsonNode request) {
        return ResponseEntity.ok(ApiResponse.success(examImportService.importFromJson(request), "Import JSON thành công"));
    }

    @PostMapping("/import/excel")
    public ResponseEntity<ApiResponse<Exam>> importExcel(
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.success(examImportService.importFromExcel(file), "Import Excel thành công"));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ExamSummaryResponse>> createExam(@RequestBody JsonNode request) {
        return ResponseEntity.ok(ApiResponse.success(examService.createAdminExam(request), "Tạo đề thi thành công"));
    }

    @GetMapping("/template/reading")
    public ResponseEntity<byte[]> downloadReadingTemplate() {
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=reading_template.xlsx")
                .body(examImportService.downloadTemplate(Skill.READING));
    }

    @GetMapping("/template/listening")
    public ResponseEntity<byte[]> downloadListeningTemplate() {
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=listening_template.xlsx")
                .body(examImportService.downloadTemplate(Skill.LISTENING));
    }

    @GetMapping("/template/reading/full-sample")
    public ResponseEntity<byte[]> downloadReadingFullSampleTemplate() {
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=reading_full_sample.xlsx")
                .body(examImportService.downloadFullSampleTemplate(Skill.READING));
    }

    @GetMapping("/template/listening/full-sample")
    public ResponseEntity<byte[]> downloadListeningFullSampleTemplate() {
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=listening_full_sample.xlsx")
                .body(examImportService.downloadFullSampleTemplate(Skill.LISTENING));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ExamSummaryResponse>>> getAllExams(
            @RequestParam(required = false) Skill skill,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(ApiResponse.success(examService.getAdminExams(skill, status, search)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ExamSummaryResponse>> updateExam(
            @PathVariable Long id,
            @RequestBody JsonNode request) {
        return ResponseEntity.ok(ApiResponse.success(examService.updateAdminExam(id, request), "Cập nhật đề thi thành công"));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<ExamSummaryResponse>> updateExamStatus(
            @PathVariable Long id,
            @RequestBody JsonNode request) {
        String status = request.path("status").asText("published");
        return ResponseEntity.ok(ApiResponse.success(examService.updateAdminExamStatus(id, status), "Cập nhật trạng thái thành công"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteExam(@PathVariable Long id) {
        examService.deleteAdminExam(id);
        return ResponseEntity.ok(ApiResponse.success("Xoá đề thi thành công"));
    }
}
