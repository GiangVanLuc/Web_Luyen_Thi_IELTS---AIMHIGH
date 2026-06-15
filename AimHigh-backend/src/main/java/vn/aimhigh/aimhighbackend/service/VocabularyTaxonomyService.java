package vn.aimhigh.aimhighbackend.service;

import vn.aimhigh.aimhighbackend.dto.request.VocabularyFolderRequest;
import vn.aimhigh.aimhighbackend.dto.request.VocabularyTopicRequest;
import vn.aimhigh.aimhighbackend.dto.response.VocabularyFolderResponse;
import vn.aimhigh.aimhighbackend.dto.response.VocabularyTopicResponse;

import java.util.List;

public interface VocabularyTaxonomyService {
    /** Cây Thư mục > Chủ đề (kèm số từ). Dùng cho cả admin và student. */
    List<VocabularyFolderResponse> getTree();

    VocabularyFolderResponse createFolder(VocabularyFolderRequest request);
    VocabularyFolderResponse updateFolder(Long folderId, VocabularyFolderRequest request);
    void deleteFolder(Long folderId);

    VocabularyTopicResponse createTopic(VocabularyTopicRequest request);
    VocabularyTopicResponse updateTopic(Long topicId, VocabularyTopicRequest request);
    void deleteTopic(Long topicId);
}
