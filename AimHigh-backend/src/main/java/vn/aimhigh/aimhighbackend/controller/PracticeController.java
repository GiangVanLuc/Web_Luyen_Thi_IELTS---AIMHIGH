package vn.aimhigh.aimhighbackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.aimhigh.aimhighbackend.dto.request.HighlightRequest;
import vn.aimhigh.aimhighbackend.dto.request.NoteRequest;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;
import vn.aimhigh.aimhighbackend.dto.response.HighlightResponse;
import vn.aimhigh.aimhighbackend.dto.response.NoteResponse;
import vn.aimhigh.aimhighbackend.service.HighlightService;
import vn.aimhigh.aimhighbackend.service.NoteService;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PracticeController {

    private final NoteService noteService;
    private final HighlightService highlightService;

    @GetMapping("/attempts/{id}/questions/{qId}/answer")
    public ResponseEntity<ApiResponse<String>> getAnswer(@PathVariable Long id, @PathVariable Long qId) {
        return ResponseEntity.ok(ApiResponse.success("Correct Answer Placeholder"));
    }

    @PostMapping("/attempts/{id}/notes")
    public ResponseEntity<ApiResponse<NoteResponse>> createNote(
            @PathVariable Long id,
            @Valid @RequestBody NoteRequest request) {
        Long userId = 1L;
        return ResponseEntity.ok(ApiResponse.success(noteService.createNote(id, request, userId)));
    }

    @GetMapping("/attempts/{id}/notes")
    public ResponseEntity<ApiResponse<List<NoteResponse>>> getNotes(@PathVariable Long id) {
        Long userId = 1L;
        return ResponseEntity.ok(ApiResponse.success(noteService.getNotes(id, userId)));
    }

    @DeleteMapping("/notes/{id}")
    public ResponseEntity<ApiResponse<String>> deleteNote(@PathVariable Long id) {
        Long userId = 1L;
        noteService.deleteNote(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Đã xoá note"));
    }

    @PostMapping("/attempts/{id}/highlights")
    public ResponseEntity<ApiResponse<HighlightResponse>> createHighlight(
            @PathVariable Long id,
            @Valid @RequestBody HighlightRequest request) {
        Long userId = 1L;
        return ResponseEntity.ok(ApiResponse.success(highlightService.createHighlight(id, request, userId)));
    }

    @GetMapping("/attempts/{id}/highlights")
    public ResponseEntity<ApiResponse<List<HighlightResponse>>> getHighlights(
            @PathVariable Long id,
            @RequestParam(required = false) Long passageId) {
        Long userId = 1L;
        return ResponseEntity.ok(ApiResponse.success(highlightService.getHighlights(id, passageId, userId)));
    }

    @DeleteMapping("/highlights/{id}")
    public ResponseEntity<ApiResponse<String>> deleteHighlight(@PathVariable Long id) {
        Long userId = 1L;
        highlightService.deleteHighlight(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Đã xoá highlight"));
    }
}
