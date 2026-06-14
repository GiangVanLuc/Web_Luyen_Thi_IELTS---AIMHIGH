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
import vn.aimhigh.aimhighbackend.enums.AttemptStatus;
import vn.aimhigh.aimhighbackend.service.HighlightService;
import vn.aimhigh.aimhighbackend.service.NoteService;
import vn.aimhigh.aimhighbackend.service.UserService;
import vn.aimhigh.aimhighbackend.repository.QuestionRepository;
import vn.aimhigh.aimhighbackend.repository.AttemptRepository;
import vn.aimhigh.aimhighbackend.model.Question;
import vn.aimhigh.aimhighbackend.model.Attempt;
import vn.aimhigh.aimhighbackend.exception.ResourceNotFoundException;
import vn.aimhigh.aimhighbackend.exception.ForbiddenException;
import vn.aimhigh.aimhighbackend.exception.BadRequestException;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PracticeController {

    private final NoteService noteService;
    private final HighlightService highlightService;
    private final UserService userService;
    private final QuestionRepository questionRepository;
    private final AttemptRepository attemptRepository;

    @GetMapping("/attempts/{id}/questions/{qId}/answer")
    public ResponseEntity<ApiResponse<String>> getAnswer(@PathVariable Long id, @PathVariable Long qId, Authentication authentication) {
        Long userId = userService.requireUser(authentication).getId();
        Attempt attempt = attemptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy attempt"));
        if (!attempt.getUser().getId().equals(userId)) {
            throw new ForbiddenException("Không có quyền truy cập bài làm này");
        }

        if (attempt.getStatus() == AttemptStatus.IN_PROGRESS) {
            throw new BadRequestException("Chỉ được xem đáp án sau khi đã nộp bài");
        }
        
        Question question = questionRepository.findById(qId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy câu hỏi"));

        if (question.getExam() == null || !question.getExam().getId().equals(attempt.getExam().getId())) {
            throw new ForbiddenException("Câu hỏi không thuộc bài làm này");
        }

        String answerAndExplanation = "Correct Answer: " + question.getCorrectAnswer();
        if (question.getExplanation() != null && !question.getExplanation().isBlank()) {
            answerAndExplanation += " | Explanation: " + question.getExplanation();
        }
        return ResponseEntity.ok(ApiResponse.success(answerAndExplanation));
    }

    @PostMapping("/attempts/{id}/notes")
    public ResponseEntity<ApiResponse<NoteResponse>> createNote(
            @PathVariable Long id,
            @Valid @RequestBody NoteRequest request,
            Authentication authentication) {
        Long userId = userService.requireUser(authentication).getId();
        return ResponseEntity.ok(ApiResponse.success(noteService.createNote(id, request, userId)));
    }

    @GetMapping("/attempts/{id}/notes")
    public ResponseEntity<ApiResponse<List<NoteResponse>>> getNotes(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = userService.requireUser(authentication).getId();
        return ResponseEntity.ok(ApiResponse.success(noteService.getNotes(id, userId)));
    }

    @DeleteMapping("/notes/{id}")
    public ResponseEntity<ApiResponse<String>> deleteNote(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = userService.requireUser(authentication).getId();
        noteService.deleteNote(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Đã xoá note"));
    }

    @PatchMapping("/notes/{id}")
    public ResponseEntity<ApiResponse<NoteResponse>> updateNote(
            @PathVariable Long id,
            @RequestBody NoteUpdateRequest request,
            Authentication authentication) {
        Long userId = userService.requireUser(authentication).getId();
        return ResponseEntity.ok(ApiResponse.success(
                noteService.updateNote(id, request != null ? request.getContent() : null, userId)
        ));
    }

    @PostMapping("/attempts/{id}/highlights")
    public ResponseEntity<ApiResponse<HighlightResponse>> createHighlight(
            @PathVariable Long id,
            @Valid @RequestBody HighlightRequest request,
            Authentication authentication) {
        Long userId = userService.requireUser(authentication).getId();
        return ResponseEntity.ok(ApiResponse.success(highlightService.createHighlight(id, request, userId)));
    }

    @GetMapping("/attempts/{id}/highlights")
    public ResponseEntity<ApiResponse<List<HighlightResponse>>> getHighlights(
            @PathVariable Long id,
            @RequestParam(required = false) Long passageId,
            Authentication authentication) {
        Long userId = userService.requireUser(authentication).getId();
        return ResponseEntity.ok(ApiResponse.success(highlightService.getHighlights(id, passageId, userId)));
    }

    @DeleteMapping("/highlights/{id}")
    public ResponseEntity<ApiResponse<String>> deleteHighlight(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = userService.requireUser(authentication).getId();
        highlightService.deleteHighlight(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Đã xoá highlight"));
    }

    @PatchMapping("/highlights/{id}/note")
    public ResponseEntity<ApiResponse<HighlightResponse>> updateHighlightNote(
            @PathVariable Long id,
            @RequestBody HighlightNoteRequest request,
            Authentication authentication) {
        Long userId = userService.requireUser(authentication).getId();
        return ResponseEntity.ok(ApiResponse.success(
                highlightService.updateHighlightNote(id, request != null ? request.getNote() : null, userId)
        ));
    }
}
