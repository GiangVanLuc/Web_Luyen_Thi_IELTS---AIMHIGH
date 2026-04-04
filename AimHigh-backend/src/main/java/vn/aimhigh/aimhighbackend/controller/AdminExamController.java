package vn.aimhigh.aimhighbackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;
import vn.aimhigh.aimhighbackend.enums.Skill;
import vn.aimhigh.aimhighbackend.model.Exam;
import vn.aimhigh.aimhighbackend.service.ExamImportService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/exams")
@RequiredArgsConstructor
public class AdminExamController {

    private final ExamImportService examImportService;

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

    @GetMapping
    public ResponseEntity<ApiResponse<String>> getAllExams() {
        return ResponseEntity.ok(ApiResponse.success("Danh sách đề thi (Admin)"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> updateExam(
            @PathVariable Long id,
            @RequestBody JsonNode request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật đề thi " + id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteExam(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Xoá đề thi " + id));
    }
}
