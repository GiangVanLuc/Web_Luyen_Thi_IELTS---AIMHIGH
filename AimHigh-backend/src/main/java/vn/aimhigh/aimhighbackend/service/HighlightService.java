package vn.aimhigh.aimhighbackend.service;

import vn.aimhigh.aimhighbackend.dto.request.HighlightRequest;
import vn.aimhigh.aimhighbackend.dto.response.HighlightResponse;

import java.util.List;

public interface HighlightService {
    HighlightResponse createHighlight(Long attemptId, HighlightRequest request, Long userId);

    List<HighlightResponse> getHighlights(Long attemptId, Long passageId, Long userId);

    void deleteHighlight(Long id, Long userId);

    HighlightResponse updateHighlightNote(Long id, String note, Long userId);
}
