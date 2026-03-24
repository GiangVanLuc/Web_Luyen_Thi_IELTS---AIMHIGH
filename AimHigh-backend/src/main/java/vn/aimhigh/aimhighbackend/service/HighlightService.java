package vn.aimhigh.aimhighbackend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import vn.aimhigh.aimhighbackend.dto.request.HighlightRequest;
import vn.aimhigh.aimhighbackend.dto.response.HighlightResponse;
import java.util.List;

@Slf4j
@Service
public class HighlightService {
    public HighlightResponse createHighlight(Long attemptId, HighlightRequest request, Long userId) { return new HighlightResponse(); }
    public List<HighlightResponse> getHighlights(Long attemptId, Long passageId, Long userId) { return List.of(); }
    public void deleteHighlight(Long id, Long userId) {}
}
