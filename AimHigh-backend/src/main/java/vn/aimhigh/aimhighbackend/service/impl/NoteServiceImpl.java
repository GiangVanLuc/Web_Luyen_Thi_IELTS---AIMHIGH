package vn.aimhigh.aimhighbackend.service.impl;

import vn.aimhigh.aimhighbackend.service.NoteService;
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
public class NoteServiceImpl implements NoteService {
    private final NoteRepository noteRepository;
    private final AttemptRepository attemptRepository;
    private final QuestionRepository questionRepository;

    @Transactional
    public NoteResponse createNote(Long attemptId, NoteRequest request, Long userId) {
        Attempt attempt = getOwnedAttempt(attemptId, userId);

        String content = request.getContent() != null ? request.getContent().trim() : "";
        if (content.isEmpty()) {
            throw new BadRequestException("Ná»™i dung note khÃ´ng Ä‘Æ°á»£c bá» trá»‘ng");
        }

        Question question = questionRepository.findById(request.getQuestionId())
                .orElseThrow(() -> new ResourceNotFoundException("KhÃ´ng tÃ¬m tháº¥y question"));

        if (question.getExam() == null || !question.getExam().getId().equals(attempt.getExam().getId())) {
            throw new BadRequestException("Question khÃ´ng thuá»™c Ä‘á» thi cá»§a attempt");
        }

        Note note = Note.builder()
                .user(attempt.getUser())
                .attempt(attempt)
                .question(question)
                .content(content)
                .build();

        Note saved = noteRepository.save(note);
        log.info("ÄÃ£ táº¡o note id={} cho attemptId={}, userId={}", saved.getId(), attemptId, userId);
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
                .orElseThrow(() -> new ResourceNotFoundException("KhÃ´ng tÃ¬m tháº¥y note"));
        noteRepository.delete(note);
        log.info("ÄÃ£ xoÃ¡ note id={} bá»Ÿi userId={}", id, userId);
    }

    @Transactional
    public NoteResponse updateNote(Long id, String content, Long userId) {
        Note note = noteRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("KhÃ´ng tÃ¬m tháº¥y note"));

        String normalized = content == null ? "" : content.trim();
        if (normalized.isEmpty()) {
            throw new BadRequestException("Ná»™i dung note khÃ´ng Ä‘Æ°á»£c bá» trá»‘ng");
        }

        note.setContent(normalized);
        Note saved = noteRepository.save(note);
        log.info("ÄÃ£ cáº­p nháº­t note id={} bá»Ÿi userId={}", id, userId);
        return toResponse(saved);
    }

    private Attempt getOwnedAttempt(Long attemptId, Long userId) {
        Attempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("KhÃ´ng tÃ¬m tháº¥y attempt"));
        if (!attempt.getUser().getId().equals(userId)) {
            throw new ForbiddenException("KhÃ´ng cÃ³ quyá»n thao tÃ¡c trÃªn attempt nÃ y");
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



