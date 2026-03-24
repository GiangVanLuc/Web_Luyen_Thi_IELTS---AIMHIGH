package vn.aimhigh.aimhighbackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.aimhigh.aimhighbackend.dto.request.SaveProgressRequest;
import vn.aimhigh.aimhighbackend.dto.request.StartAttemptRequest;
import vn.aimhigh.aimhighbackend.dto.request.SubmitAttemptRequest;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;
import vn.aimhigh.aimhighbackend.dto.response.AttemptResponse;
import vn.aimhigh.aimhighbackend.dto.response.ProgressResponse;
import vn.aimhigh.aimhighbackend.dto.response.ResultResponse;
import vn.aimhigh.aimhighbackend.service.AttemptService;

import java.util.List;

@RestController
@RequestMapping("/api/attempts")
@RequiredArgsConstructor
public class AttemptController {

    private final AttemptService attemptService;

    @PostMapping("/start")
    public ResponseEntity<ApiResponse<AttemptResponse>> startAttempt(
            @Valid @RequestBody StartAttemptRequest request) {
        // TODO: Get exact userId from jwt via SecurityContext
        Long userId = 1L; 
        return ResponseEntity.ok(ApiResponse.success(attemptService.startAttempt(request, userId)));
    }

    @PostMapping("/{id}/progress")
    public ResponseEntity<ApiResponse<String>> saveProgress(
            @PathVariable Long id,
            @Valid @RequestBody SaveProgressRequest request) {
        Long userId = 1L;
        attemptService.saveProgress(id, request, userId);
        return ResponseEntity.ok(ApiResponse.success("Lưu tiến độ thành công"));
    }

    @GetMapping("/{id}/progress")
    public ResponseEntity<ApiResponse<List<ProgressResponse>>> getProgress(@PathVariable Long id) {
        Long userId = 1L;
        return ResponseEntity.ok(ApiResponse.success(attemptService.getProgress(id, userId)));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<ApiResponse<ResultResponse>> submitAttempt(
            @PathVariable Long id,
            @Valid @RequestBody SubmitAttemptRequest request) {
        Long userId = 1L;
        return ResponseEntity.ok(ApiResponse.success(attemptService.submitAttempt(id, request, userId)));
    }
}
