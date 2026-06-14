package vn.aimhigh.aimhighbackend.service;

import vn.aimhigh.aimhighbackend.dto.request.CustomVocabularyRequest;
import vn.aimhigh.aimhighbackend.dto.request.SaveVocabularyRequest;
import vn.aimhigh.aimhighbackend.dto.request.UserVocabularyBatchDeleteRequest;
import vn.aimhigh.aimhighbackend.dto.request.UserVocabularyBatchSaveRequest;
import vn.aimhigh.aimhighbackend.dto.request.UserVocabularyBatchStatusRequest;
import vn.aimhigh.aimhighbackend.dto.request.UserVocabularyGroupCreateRequest;
import vn.aimhigh.aimhighbackend.dto.request.UserVocabularyGroupUpdateRequest;
import vn.aimhigh.aimhighbackend.dto.request.UserVocabularyUpdateRequest;
import vn.aimhigh.aimhighbackend.dto.response.UserVocabularyBatchResultResponse;
import vn.aimhigh.aimhighbackend.dto.response.UserVocabularyGroupResponse;
import vn.aimhigh.aimhighbackend.dto.response.VocabularyResponse;

import java.time.LocalDate;
import java.util.List;

public interface VocabularyService {
    VocabularyResponse lookup(String word, Long userId);

    List<VocabularyResponse> getGlobalVocabulary(String keyword, String partOfSpeech, Integer page, Integer size, Long userId);

    VocabularyResponse saveToUserVocabulary(SaveVocabularyRequest request, Long userId);

    VocabularyResponse saveCustomVocabulary(CustomVocabularyRequest request, Long userId);

    List<VocabularyResponse> getUserVocabulary(
            Long userId,
            Boolean learned,
            Long groupId,
            String partOfSpeech,
            Integer learnLevel,
            LocalDate fromDate,
            LocalDate toDate,
            String keyword,
            String sort,
            Integer page,
            Integer size
    );

    void deleteUserVocabulary(Long id, Long userId);

    VocabularyResponse updateUserVocabularyStatus(Long userVocabularyId, Integer learnLevel, Long userId);

    VocabularyResponse updateUserVocabulary(Long userVocabularyId, UserVocabularyUpdateRequest request, Long userId);

    UserVocabularyBatchResultResponse batchSaveToUserVocabulary(UserVocabularyBatchSaveRequest request, Long userId);

    UserVocabularyBatchResultResponse batchUpdateStatus(UserVocabularyBatchStatusRequest request, Long userId);

    UserVocabularyBatchResultResponse batchDelete(UserVocabularyBatchDeleteRequest request, Long userId);

    List<UserVocabularyGroupResponse> getUserVocabularyGroups(Long userId);

    UserVocabularyGroupResponse createUserVocabularyGroup(UserVocabularyGroupCreateRequest request, Long userId);

    UserVocabularyGroupResponse renameUserVocabularyGroup(Long groupId, UserVocabularyGroupUpdateRequest request, Long userId);

    void deleteUserVocabularyGroup(Long groupId, Long userId);
}
