package vn.aimhigh.aimhighbackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;
import vn.aimhigh.aimhighbackend.dto.response.AttemptResponse;
import vn.aimhigh.aimhighbackend.dto.response.ResultResponse;
import vn.aimhigh.aimhighbackend.service.ResultService;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ResultController {

    private final ResultService resultService;

    @GetMapping("/attempts/{id}/result")
    public ResponseEntity<ApiResponse<ResultResponse>> getResult(@PathVariable Long id) {
        Long userId = 1L;
        return ResponseEntity.ok(ApiResponse.success(resultService.getResult(id, userId)));
    }

    @GetMapping("/users/me/attempts")
    public ResponseEntity<ApiResponse<List<AttemptResponse>>> getMyAttempts() {
        return ResponseEntity.ok(ApiResponse.success(List.of()));
    }
}
