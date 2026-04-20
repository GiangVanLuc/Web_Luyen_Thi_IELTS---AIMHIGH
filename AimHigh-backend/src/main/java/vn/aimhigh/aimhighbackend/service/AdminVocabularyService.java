package vn.aimhigh.aimhighbackend.service;

import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;
import vn.aimhigh.aimhighbackend.dto.request.AdminVocabularyUpsertRequest;
import vn.aimhigh.aimhighbackend.dto.response.AdminVocabularyImportResponse;
import vn.aimhigh.aimhighbackend.dto.response.VocabularyResponse;

import java.util.List;

public interface AdminVocabularyService {
    List<VocabularyResponse> getVocabulary(String keyword, String partOfSpeech, Integer page, Integer size);

    VocabularyResponse upsertVocabulary(AdminVocabularyUpsertRequest request);

    void deleteVocabulary(Long vocabularyId);

    AdminVocabularyImportResponse importFromJson(JsonNode payload);

    AdminVocabularyImportResponse importFromExcel(MultipartFile file);
}
