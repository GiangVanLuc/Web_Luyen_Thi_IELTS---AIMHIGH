package vn.aimhigh.aimhighbackend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import vn.aimhigh.aimhighbackend.dto.request.NoteRequest;
import vn.aimhigh.aimhighbackend.dto.response.NoteResponse;
import java.util.List;

@Slf4j
@Service
public class NoteService {
    public NoteResponse createNote(Long attemptId, NoteRequest request, Long userId) { return new NoteResponse(); }
    public List<NoteResponse> getNotes(Long attemptId, Long userId) { return List.of(); }
    public void deleteNote(Long id, Long userId) {}
}
