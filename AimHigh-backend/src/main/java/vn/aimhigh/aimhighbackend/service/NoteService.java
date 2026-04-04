package vn.aimhigh.aimhighbackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.aimhigh.aimhighbackend.dto.request.NoteRequest;
import vn.aimhigh.aimhighbackend.dto.response.NoteResponse;
import vn.aimhigh.aimhighbackend.exception.BadRequestException;
import vn.aimhigh.aimhighbackend.exception.ForbiddenException;
import vn.aimhigh.aimhighbackend.exception.ResourceNotFoundException;
import vn.aimhigh.aimhighbackend.model.Attempt;
import vn.aimhigh.aimhighbackend.model.Note;
import vn.aimhigh.aimhighbackend.model.Question;
import vn.aimhigh.aimhighbackend.repository.AttemptRepository;
import vn.aimhigh.aimhighbackend.repository.NoteRepository;
import vn.aimhigh.aimhighbackend.repository.QuestionRepository;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NoteService {
    private final NoteRepository noteRepository;
    private final AttemptRepository attemptRepository;
    private final QuestionRepository questionRepository;

    @Transactional
    public NoteResponse createNote(Long attemptId, NoteRequest request, Long userId) {
        Attempt attempt = getOwnedAttempt(attemptId, userId);

        String content = request.getContent() != null ? request.getContent().trim() : "";
        if (content.isEmpty()) {
            throw new BadRequestException("Nội dung note không được bỏ trống");
        }

        Question question = questionRepository.findById(request.getQuestionId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy question"));

        if (question.getExam() == null || !question.getExam().getId().equals(attempt.getExam().getId())) {
            throw new BadRequestException("Question không thuộc đề thi của attempt");
        }

        Note note = Note.builder()
                .user(attempt.getUser())
                .attempt(attempt)
                .question(question)
                .content(content)
                .build();

        Note saved = noteRepository.save(note);
        log.info("Đã tạo note id={} cho attemptId={}, userId={}", saved.getId(), attemptId, userId);
        return toResponse(saved);
    }

    public List<NoteResponse> getNotes(Long attemptId, Long userId) {
        getOwnedAttempt(attemptId, userId);
        return noteRepository.findByAttemptIdAndUserIdOrderByCreatedAtDesc(attemptId, userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void deleteNote(Long id, Long userId) {
        Note note = noteRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy note"));
        noteRepository.delete(note);
        log.info("Đã xoá note id={} bởi userId={}", id, userId);
    }

    private Attempt getOwnedAttempt(Long attemptId, Long userId) {
        Attempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy attempt"));
        if (!attempt.getUser().getId().equals(userId)) {
            throw new ForbiddenException("Không có quyền thao tác trên attempt này");
        }
        return attempt;
    }

    private NoteResponse toResponse(Note note) {
        return NoteResponse.builder()
                .id(note.getId())
                .questionId(note.getQuestion() != null ? note.getQuestion().getId() : null)
                .content(note.getContent())
                .createdAt(note.getCreatedAt())
                .build();
    }
}
