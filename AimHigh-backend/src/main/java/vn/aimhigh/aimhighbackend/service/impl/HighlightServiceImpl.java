package vn.aimhigh.aimhighbackend.service.impl;

import vn.aimhigh.aimhighbackend.service.HighlightService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.aimhigh.aimhighbackend.dto.request.HighlightRequest;
import vn.aimhigh.aimhighbackend.dto.response.HighlightResponse;
import vn.aimhigh.aimhighbackend.exception.BadRequestException;
import vn.aimhigh.aimhighbackend.exception.ForbiddenException;
import vn.aimhigh.aimhighbackend.exception.ResourceNotFoundException;
import vn.aimhigh.aimhighbackend.model.Attempt;
import vn.aimhigh.aimhighbackend.model.Highlight;
import vn.aimhigh.aimhighbackend.model.ReadingPassage;
import vn.aimhigh.aimhighbackend.repository.AttemptRepository;
import vn.aimhigh.aimhighbackend.repository.HighlightRepository;
import vn.aimhigh.aimhighbackend.repository.ReadingPassageRepository;

import java.util.List;

import static java.util.Objects.isNull;

@Slf4j
@Service
@RequiredArgsConstructor
public class HighlightServiceImpl implements HighlightService {
    private final HighlightRepository highlightRepository;
    private final AttemptRepository attemptRepository;
    private final ReadingPassageRepository readingPassageRepository;

    @Transactional
    public HighlightResponse createHighlight(Long attemptId, HighlightRequest request, Long userId) {
        Attempt attempt = getOwnedAttempt(attemptId, userId);
        ReadingPassage passage = getPassageInExam(request.getPassageId(), attempt.getExam().getId());

        validateOffset(request.getStartOffset(), request.getEndOffset());

        Highlight highlight = Highlight.builder()
                .user(attempt.getUser())
                .attempt(attempt)
                .readingPassage(passage)
                .startOffset(request.getStartOffset())
                .endOffset(request.getEndOffset())
                .color(isNull(request.getColor()) || request.getColor().isBlank() ? "hl-y" : request.getColor().trim())
                .note(normalizeNullableText(request.getNote()))
                .build();

        Highlight saved = highlightRepository.save(highlight);
        log.info("ÄÃ£ táº¡o highlight id={} cho attemptId={}, userId={}", saved.getId(), attemptId, userId);
        return toResponse(saved);
    }

    public List<HighlightResponse> getHighlights(Long attemptId, Long passageId, Long userId) {
        Attempt attempt = getOwnedAttempt(attemptId, userId);
        List<Highlight> highlights;

        if (passageId != null) {
            getPassageInExam(passageId, attempt.getExam().getId());
            highlights = highlightRepository.findByAttemptIdAndReadingPassageIdAndUserIdOrderByCreatedAtAsc(
                    attemptId,
                    passageId,
                    userId
            );
        } else {
            highlights = highlightRepository.findByAttemptIdAndUserIdOrderByCreatedAtAsc(attemptId, userId);
        }

        return highlights.stream().map(this::toResponse).toList();
    }

    @Transactional
    public void deleteHighlight(Long id, Long userId) {
        Highlight highlight = highlightRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("KhÃ´ng tÃ¬m tháº¥y highlight"));
        highlightRepository.delete(highlight);
        log.info("ÄÃ£ xoÃ¡ highlight id={} bá»Ÿi userId={}", id, userId);
    }

    @Transactional
    public HighlightResponse updateHighlightNote(Long id, String note, Long userId) {
        Highlight highlight = highlightRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("KhÃ´ng tÃ¬m tháº¥y highlight"));

        highlight.setNote(normalizeNullableText(note));
        Highlight saved = highlightRepository.save(highlight);
        log.info("ÄÃ£ cáº­p nháº­t note cho highlight id={} bá»Ÿi userId={}", id, userId);
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

    private ReadingPassage getPassageInExam(Long passageId, Long examId) {
        ReadingPassage passage = readingPassageRepository.findById(passageId)
                .orElseThrow(() -> new ResourceNotFoundException("KhÃ´ng tÃ¬m tháº¥y passage"));
        if (passage.getExam() == null || !passage.getExam().getId().equals(examId)) {
            throw new BadRequestException("Passage khÃ´ng thuá»™c Ä‘á» thi cá»§a attempt");
        }
        return passage;
    }

    private void validateOffset(Integer startOffset, Integer endOffset) {
        if (startOffset == null || endOffset == null) {
            throw new BadRequestException("StartOffset vÃ  EndOffset khÃ´ng Ä‘Æ°á»£c bá» trá»‘ng");
        }
        if (startOffset < 0 || endOffset <= startOffset) {
            throw new BadRequestException("Offset khÃ´ng há»£p lá»‡");
        }
    }

    private String normalizeNullableText(String text) {
        if (text == null) {
            return null;
        }
        String trimmed = text.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private HighlightResponse toResponse(Highlight highlight) {
        return HighlightResponse.builder()
                .id(highlight.getId())
                .passageId(highlight.getReadingPassage() != null ? highlight.getReadingPassage().getId() : null)
                .startOffset(highlight.getStartOffset())
                .endOffset(highlight.getEndOffset())
                .color(highlight.getColor())
                .note(highlight.getNote())
                .createdAt(highlight.getCreatedAt())
                .build();
    }
}



