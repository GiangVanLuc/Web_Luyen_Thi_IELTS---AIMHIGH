package vn.aimhigh.aimhighbackend.service;

import vn.aimhigh.aimhighbackend.dto.request.SaveVocabularyRequest;
import vn.aimhigh.aimhighbackend.dto.response.VocabularyResponse;

import java.util.List;

public interface VocabularyService {
    VocabularyResponse lookup(String word, Long userId);

    void saveToUserVocabulary(SaveVocabularyRequest request, Long userId);

    List<VocabularyResponse> getUserVocabulary(Long userId, Boolean learned);

    void deleteUserVocabulary(Long id, Long userId);
}
