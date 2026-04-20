package vn.aimhigh.aimhighbackend.service;

import vn.aimhigh.aimhighbackend.dto.request.NoteRequest;
import vn.aimhigh.aimhighbackend.dto.response.NoteResponse;

import java.util.List;

public interface NoteService {
    NoteResponse createNote(Long attemptId, NoteRequest request, Long userId);

    List<NoteResponse> getNotes(Long attemptId, Long userId);

    void deleteNote(Long id, Long userId);

    NoteResponse updateNote(Long id, String content, Long userId);
}
