package vn.aimhigh.aimhighbackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.aimhigh.aimhighbackend.dto.request.HighlightNoteRequest;
import vn.aimhigh.aimhighbackend.dto.request.HighlightRequest;
import vn.aimhigh.aimhighbackend.dto.request.NoteRequest;
import vn.aimhigh.aimhighbackend.dto.request.NoteUpdateRequest;
import vn.aimhigh.aimhighbackend.dto.response.ApiResponse;
import vn.aimhigh.aimhighbackend.dto.response.HighlightResponse;
import vn.aimhigh.aimhighbackend.dto.response.NoteResponse;
import vn.aimhigh.aimhighbackend.exception.UnauthorizedException;
import vn.aimhigh.aimhighbackend.repository.UserRepository;
import vn.aimhigh.aimhighbackend.service.HighlightService;
import vn.aimhigh.aimhighbackend.service.NoteService;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PracticeController {

    private final NoteService noteService;
    private final HighlightService highlightService;
    private final UserRepository userRepository;

    @GetMapping("/attempts/{id}/questions/{qId}/answer")
    public ResponseEntity<ApiResponse<String>> getAnswer(@PathVariable Long id, @PathVariable Long qId) {
        return ResponseEntity.ok(ApiResponse.success("Correct Answer Placeholder"));
    }

    @PostMapping("/attempts/{id}/notes")
    public ResponseEntity<ApiResponse<NoteResponse>> createNote(
            @PathVariable Long id,
            @Valid @RequestBody NoteRequest request,
            Authentication authentication) {
        Long userId = requireUserId(authentication);
        return ResponseEntity.ok(ApiResponse.success(noteService.createNote(id, request, userId)));
    }

    @GetMapping("/attempts/{id}/notes")
    public ResponseEntity<ApiResponse<List<NoteResponse>>> getNotes(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = requireUserId(authentication);
        return ResponseEntity.ok(ApiResponse.success(noteService.getNotes(id, userId)));
    }

    @DeleteMapping("/notes/{id}")
    public ResponseEntity<ApiResponse<String>> deleteNote(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = requireUserId(authentication);
        noteService.deleteNote(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Đã xoá note"));
    }

    @PatchMapping("/notes/{id}")
    public ResponseEntity<ApiResponse<NoteResponse>> updateNote(
            @PathVariable Long id,
            @RequestBody NoteUpdateRequest request,
            Authentication authentication) {
        Long userId = requireUserId(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                noteService.updateNote(id, request != null ? request.getContent() : null, userId)
        ));
    }

    @PostMapping("/attempts/{id}/highlights")
    public ResponseEntity<ApiResponse<HighlightResponse>> createHighlight(
            @PathVariable Long id,
            @Valid @RequestBody HighlightRequest request,
            Authentication authentication) {
        Long userId = requireUserId(authentication);
        return ResponseEntity.ok(ApiResponse.success(highlightService.createHighlight(id, request, userId)));
    }

    @GetMapping("/attempts/{id}/highlights")
    public ResponseEntity<ApiResponse<List<HighlightResponse>>> getHighlights(
            @PathVariable Long id,
            @RequestParam(required = false) Long passageId,
            Authentication authentication) {
        Long userId = requireUserId(authentication);
        return ResponseEntity.ok(ApiResponse.success(highlightService.getHighlights(id, passageId, userId)));
    }

    @DeleteMapping("/highlights/{id}")
    public ResponseEntity<ApiResponse<String>> deleteHighlight(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = requireUserId(authentication);
        highlightService.deleteHighlight(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Đã xoá highlight"));
    }

    @PatchMapping("/highlights/{id}/note")
    public ResponseEntity<ApiResponse<HighlightResponse>> updateHighlightNote(
            @PathVariable Long id,
            @RequestBody HighlightNoteRequest request,
            Authentication authentication) {
        Long userId = requireUserId(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                highlightService.updateHighlightNote(id, request != null ? request.getNote() : null, userId)
        ));
    }

    private Long requireUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("Bạn cần đăng nhập để thực hiện thao tác này");
        }

        String email = authentication.getName();
        if (email == null || email.isBlank()) {
            throw new UnauthorizedException("Không xác định được người dùng từ token");
        }

        return userRepository.findByEmail(email)
                .map(vn.aimhigh.aimhighbackend.model.User::getId)
                .orElseThrow(() -> new UnauthorizedException("Phiên đăng nhập không hợp lệ"));
    }
}
