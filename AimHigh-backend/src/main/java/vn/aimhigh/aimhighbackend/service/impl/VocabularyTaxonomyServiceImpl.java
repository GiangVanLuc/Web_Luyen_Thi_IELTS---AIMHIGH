package vn.aimhigh.aimhighbackend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.aimhigh.aimhighbackend.dto.request.VocabularyFolderRequest;
import vn.aimhigh.aimhighbackend.dto.request.VocabularyTopicRequest;
import vn.aimhigh.aimhighbackend.dto.response.VocabularyFolderResponse;
import vn.aimhigh.aimhighbackend.dto.response.VocabularyTopicResponse;
import vn.aimhigh.aimhighbackend.exception.BadRequestException;
import vn.aimhigh.aimhighbackend.exception.ResourceNotFoundException;
import vn.aimhigh.aimhighbackend.model.Folder;
import vn.aimhigh.aimhighbackend.model.Topic;
import vn.aimhigh.aimhighbackend.model.Vocabulary;
import vn.aimhigh.aimhighbackend.repository.FolderRepository;
import vn.aimhigh.aimhighbackend.repository.TopicRepository;
import vn.aimhigh.aimhighbackend.repository.VocabularyRepository;
import vn.aimhigh.aimhighbackend.service.VocabularyTaxonomyService;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional
public class VocabularyTaxonomyServiceImpl implements VocabularyTaxonomyService {

    private final FolderRepository folderRepository;
    private final TopicRepository topicRepository;
    private final VocabularyRepository vocabularyRepository;

    @Override
    @Transactional(readOnly = true)
    public List<VocabularyFolderResponse> getTree() {
        return folderRepository.findAllByOrderByDisplayOrderAscNameAsc().stream()
                .map(folder -> {
                    List<VocabularyTopicResponse> topics = topicRepository
                            .findByFolderIdOrderByDisplayOrderAscNameAsc(folder.getId())
                            .stream()
                            .map(topic -> toTopicResponse(topic, folder))
                            .toList();
                    long total = topics.stream()
                            .mapToLong(t -> t.getWordCount() == null ? 0L : t.getWordCount())
                            .sum();
                    return VocabularyFolderResponse.builder()
                            .id(folder.getId())
                            .name(folder.getName())
                            .displayOrder(folder.getDisplayOrder())
                            .wordCount(total)
                            .topics(topics)
                            .build();
                })
                .toList();
    }

    @Override
    public VocabularyFolderResponse createFolder(VocabularyFolderRequest request) {
        String name = sanitize(request.getName(), "Tên thư mục không được bỏ trống");
        String normalized = name.toLowerCase(Locale.ROOT);
        if (folderRepository.existsByNormalizedName(normalized)) {
            throw new BadRequestException("Thư mục đã tồn tại");
        }
        Folder folder = Folder.builder()
                .name(name)
                .normalizedName(normalized)
                .displayOrder(request.getDisplayOrder() == null ? 0 : request.getDisplayOrder())
                .build();
        Folder saved = folderRepository.save(folder);
        return toFolderResponse(saved, 0L);
    }

    @Override
    public VocabularyFolderResponse updateFolder(Long folderId, VocabularyFolderRequest request) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thư mục"));
        String name = sanitize(request.getName(), "Tên thư mục không được bỏ trống");
        String normalized = name.toLowerCase(Locale.ROOT);
        if (!normalized.equals(folder.getNormalizedName()) && folderRepository.existsByNormalizedName(normalized)) {
            throw new BadRequestException("Thư mục đã tồn tại");
        }
        folder.setName(name);
        folder.setNormalizedName(normalized);
        if (request.getDisplayOrder() != null) {
            folder.setDisplayOrder(request.getDisplayOrder());
        }
        Folder saved = folderRepository.save(folder);
        return toFolderResponse(saved, null);
    }

    @Override
    public void deleteFolder(Long folderId) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thư mục"));
        // Gỡ phân loại cho các từ rồi xoá chủ đề con (không xoá từ vựng)
        topicRepository.findByFolderIdOrderByDisplayOrderAscNameAsc(folderId)
                .forEach(this::detachAndDeleteTopic);
        folderRepository.delete(folder);
    }

    @Override
    public VocabularyTopicResponse createTopic(VocabularyTopicRequest request) {
        Folder folder = folderRepository.findById(request.getFolderId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thư mục"));
        String name = sanitize(request.getName(), "Tên chủ đề không được bỏ trống");
        String normalized = name.toLowerCase(Locale.ROOT);
        if (topicRepository.existsByFolderIdAndNormalizedName(folder.getId(), normalized)) {
            throw new BadRequestException("Chủ đề đã tồn tại trong thư mục này");
        }
        Topic topic = Topic.builder()
                .name(name)
                .normalizedName(normalized)
                .folder(folder)
                .displayOrder(request.getDisplayOrder() == null ? 0 : request.getDisplayOrder())
                .build();
        Topic saved = topicRepository.save(topic);
        return toTopicResponse(saved, folder);
    }

    @Override
    public VocabularyTopicResponse updateTopic(Long topicId, VocabularyTopicRequest request) {
        Topic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chủ đề"));
        Folder folder = folderRepository.findById(request.getFolderId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thư mục"));
        String name = sanitize(request.getName(), "Tên chủ đề không được bỏ trống");
        String normalized = name.toLowerCase(Locale.ROOT);
        boolean nameOrFolderChanged = !normalized.equals(topic.getNormalizedName())
                || topic.getFolder() == null
                || !folder.getId().equals(topic.getFolder().getId());
        if (nameOrFolderChanged && topicRepository.existsByFolderIdAndNormalizedName(folder.getId(), normalized)) {
            throw new BadRequestException("Chủ đề đã tồn tại trong thư mục này");
        }
        topic.setName(name);
        topic.setNormalizedName(normalized);
        topic.setFolder(folder);
        if (request.getDisplayOrder() != null) {
            topic.setDisplayOrder(request.getDisplayOrder());
        }
        Topic saved = topicRepository.save(topic);
        return toTopicResponse(saved, folder);
    }

    @Override
    public void deleteTopic(Long topicId) {
        Topic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chủ đề"));
        detachAndDeleteTopic(topic);
    }

    /** Gỡ liên kết topic khỏi các từ (không xoá từ) rồi xoá chủ đề. */
    private void detachAndDeleteTopic(Topic topic) {
        List<Vocabulary> vocabularies = vocabularyRepository.findByTopicId(topic.getId());
        if (!vocabularies.isEmpty()) {
            vocabularies.forEach(v -> v.setTopic(null));
            vocabularyRepository.saveAll(vocabularies);
        }
        topicRepository.delete(topic);
    }

    private VocabularyTopicResponse toTopicResponse(Topic topic, Folder folder) {
        return VocabularyTopicResponse.builder()
                .id(topic.getId())
                .name(topic.getName())
                .folderId(folder == null ? null : folder.getId())
                .folderName(folder == null ? null : folder.getName())
                .displayOrder(topic.getDisplayOrder())
                .wordCount(vocabularyRepository.countByTopicId(topic.getId()))
                .build();
    }

    private VocabularyFolderResponse toFolderResponse(Folder folder, Long wordCount) {
        return VocabularyFolderResponse.builder()
                .id(folder.getId())
                .name(folder.getName())
                .displayOrder(folder.getDisplayOrder())
                .wordCount(wordCount)
                .topics(List.of())
                .build();
    }

    private String sanitize(String value, String errorMessage) {
        String cleaned = value == null ? "" : value.trim();
        if (cleaned.isEmpty()) {
            throw new BadRequestException(errorMessage);
        }
        return cleaned;
    }
}
