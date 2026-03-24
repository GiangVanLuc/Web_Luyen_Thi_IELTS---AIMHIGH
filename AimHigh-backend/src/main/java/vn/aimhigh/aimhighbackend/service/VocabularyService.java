package vn.aimhigh.aimhighbackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import vn.aimhigh.aimhighbackend.dto.request.SaveVocabularyRequest;
import vn.aimhigh.aimhighbackend.dto.response.VocabularyResponse;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class VocabularyService {
    public VocabularyResponse lookup(String word, Long userId) {
        return null;
    }
    public void saveToUserVocabulary(SaveVocabularyRequest request, Long userId) {}
    public List<VocabularyResponse> getUserVocabulary(Long userId, Boolean learned) { return List.of(); }
    public void deleteUserVocabulary(Long id, Long userId) {}
}
