package vn.aimhigh.aimhighbackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;
import vn.aimhigh.aimhighbackend.dto.response.ExamDetailResponse;
import vn.aimhigh.aimhighbackend.dto.response.ExamSummaryResponse;
import vn.aimhigh.aimhighbackend.enums.ExamLevel;
import vn.aimhigh.aimhighbackend.enums.Skill;
import vn.aimhigh.aimhighbackend.service.ExamService;

import java.util.List;

@RestController
@RequestMapping("/api/exams")
@RequiredArgsConstructor
public class ExamController {

    private final ExamService examService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ExamSummaryResponse>>> getExams(
            @RequestParam(required = false) Skill skill,
            @RequestParam(required = false) ExamLevel level) {
        return ResponseEntity.ok(ApiResponse.success(examService.getExams(skill, level)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ExamDetailResponse>> getExamDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(examService.getExamDetail(id)));
    }
}
