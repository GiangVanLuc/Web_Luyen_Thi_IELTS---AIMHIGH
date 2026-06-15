package vn.aimhigh.aimhighbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
import vn.aimhigh.aimhighbackend.exception.BadRequestException;
import vn.aimhigh.aimhighbackend.exception.ResourceNotFoundException;
import vn.aimhigh.aimhighbackend.enums.VocabularySourceType;
import vn.aimhigh.aimhighbackend.model.Folder;
import vn.aimhigh.aimhighbackend.model.Topic;
import vn.aimhigh.aimhighbackend.model.User;
import vn.aimhigh.aimhighbackend.model.UserVocabulary;
import vn.aimhigh.aimhighbackend.model.UserVocabularyGroup;
import vn.aimhigh.aimhighbackend.model.Vocabulary;
import vn.aimhigh.aimhighbackend.model.StudyLog;
import vn.aimhigh.aimhighbackend.repository.StudyLogRepository;
import vn.aimhigh.aimhighbackend.repository.UserRepository;
import vn.aimhigh.aimhighbackend.repository.UserVocabularyGroupRepository;
import vn.aimhigh.aimhighbackend.repository.UserVocabularyRepository;
import vn.aimhigh.aimhighbackend.repository.VocabularyExampleRepository;
import vn.aimhigh.aimhighbackend.repository.VocabularyRepository;
import vn.aimhigh.aimhighbackend.service.VocabularyService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class VocabularyServiceImpl implements VocabularyService {
    private static final String DEFAULT_GROUP_NAME = "Sổ từ vựng";

    private final VocabularyRepository vocabularyRepository;
    private final UserVocabularyRepository userVocabularyRepository;
    private final UserVocabularyGroupRepository userVocabularyGroupRepository;
    private final VocabularyExampleRepository vocabularyExampleRepository;
    private final UserRepository userRepository;
    private final StudyLogRepository studyLogRepository;

    @Override
    @Transactional(readOnly = true)
    public VocabularyResponse lookup(String word, Long userId) {
        String normalizedWord = normalizeWord(word);
        if (normalizedWord.isBlank()) {
            throw new BadRequestException("Invalid vocabulary word");
        }

        Vocabulary vocab = vocabularyRepository.findByNormalizedWord(normalizedWord)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy từ trong AimHigh Pick"));

        Optional<UserVocabulary> saved = userVocabularyRepository.findByUserIdAndVocabularyId(userId, vocab.getId());
        return toResponse(vocab, saved.orElse(null));
    }

    @Override
    @Transactional(readOnly = true)
    public List<VocabularyResponse> getGlobalVocabulary(String keyword, String partOfSpeech, Long topicId, Integer page, Integer size, Long userId) {
        int safePage = page == null || page < 0 ? 0 : page;
        int safeSize = size == null ? 50 : Math.min(Math.max(size, 1), 200);
        String normalizedPos = trimToNull(partOfSpeech);
        if (normalizedPos != null) {
            normalizedPos = normalizedPos.toLowerCase(Locale.ROOT);
        }

        return vocabularyRepository.searchVocabulary(
                        trimToNull(keyword),
                        normalizedPos,
                        topicId,
                        PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.ASC, "word"))
                )
                .stream()
                .map(vocab -> toResponse(vocab, userVocabularyRepository.findByUserIdAndVocabularyId(userId, vocab.getId()).orElse(null)))
                .toList();
    }

    @Override
    public VocabularyResponse saveToUserVocabulary(SaveVocabularyRequest request, Long userId) {
        Vocabulary vocab = vocabularyRepository.findById(request.getVocabId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy từ vựng"));

        String groupName = trimToNull(request.getGroupName());
        String note = trimToNull(request.getNote());

        // Backward compatibility: FE cũ gửi tên nhóm vào trường note.
        if (request.getGroupId() == null && groupName == null && note != null) {
            groupName = note;
            note = null;
        }

        UserVocabularyGroup targetGroup = resolveTargetGroup(userId, request.getGroupId(), groupName);

        Optional<UserVocabulary> existing = userVocabularyRepository.findByUserIdAndVocabularyId(userId, request.getVocabId());
        if (existing.isPresent()) {
            UserVocabulary userVocabulary = existing.get();
            boolean changed = false;

            if (targetGroup != null && (userVocabulary.getGroup() == null || !Objects.equals(userVocabulary.getGroup().getId(), targetGroup.getId()))) {
                userVocabulary.setGroup(targetGroup);
                changed = true;
            }

            if (note != null && !Objects.equals(note, userVocabulary.getNote())) {
                userVocabulary.setNote(note);
                changed = true;
            }

            if (changed) {
                userVocabulary = userVocabularyRepository.save(userVocabulary);
            }
            return toResponse(vocab, userVocabulary);
        }

        User user = getUser(userId);
        UserVocabulary userVocab = UserVocabulary.builder()
                .user(user)
                .vocabulary(vocab)
                .sourceType(VocabularySourceType.GLOBAL)
                .group(targetGroup)
                .learned(false)
                .learnLevel(0)
                .note(note)
                .build();
        UserVocabulary saved = userVocabularyRepository.save(userVocab);
        
        // Ghi nhật ký học tập lưu từ vựng
        studyLogRepository.save(StudyLog.builder()
                .user(user)
                .activity("VOCABULARY_SAVE")
                .detail(vocab.getWord())
                .duration(1)
                .createdAt(LocalDateTime.now())
                .build());

        return toResponse(vocab, saved);
    }

    @Override
    public VocabularyResponse saveCustomVocabulary(CustomVocabularyRequest request, Long userId) {
        String cleanedWord = trimToNull(request.getWord());
        if (cleanedWord == null) {
            throw new BadRequestException("Từ vựng không được bỏ trống");
        }

        String normalizedWord = normalizeWord(cleanedWord);
        UserVocabularyGroup targetGroup = resolveTargetGroup(userId, request.getGroupId(), request.getGroupName());
        Optional<UserVocabulary> existing = userVocabularyRepository.findByUserIdAndCustomNormalizedWord(userId, normalizedWord);

        UserVocabulary userVocabulary = existing.orElseGet(() -> UserVocabulary.builder()
                .user(getUser(userId))
                .sourceType(VocabularySourceType.CUSTOM)
                .learned(false)
                .learnLevel(0)
                .build());

        userVocabulary.setVocabulary(null);
        userVocabulary.setSourceType(VocabularySourceType.CUSTOM);
        userVocabulary.setCustomWord(cleanedWord);
        userVocabulary.setCustomIpa(trimToNull(firstNonBlank(request.getIpa(), request.getPronunciation())));
        userVocabulary.setCustomPartOfSpeech(trimToNull(request.getPartOfSpeech()));
        userVocabulary.setCustomMeaning(trimToNull(request.getMeaning()));
        userVocabulary.setCustomViMeaning(trimToNull(firstNonBlank(request.getViMeaning(), request.getMeaning())));
        userVocabulary.setGroup(targetGroup);
        userVocabulary.setNote(trimToNull(request.getNote()));

        UserVocabulary saved = userVocabularyRepository.save(userVocabulary);
        return toResponse(null, saved);
    }

    @Override
    @Transactional
    public List<VocabularyResponse> getUserVocabulary(
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
    ) {
        ensureDefaultGroup(userId);

        LocalDateTime fromDateTime = fromDate == null ? null : fromDate.atStartOfDay();
        LocalDateTime toDateTime = toDate == null ? null : toDate.plusDays(1).atStartOfDay().minusNanos(1);

        if (fromDateTime != null && toDateTime != null && fromDateTime.isAfter(toDateTime)) {
            LocalDateTime temp = fromDateTime;
            fromDateTime = toDateTime;
            toDateTime = temp;
        }

        Integer normalizedLearnLevel = learnLevel == null ? null : normalizeLearnLevel(learnLevel);
        String normalizedPos = trimToNull(partOfSpeech);
        if (normalizedPos != null) {
            normalizedPos = normalizedPos.toLowerCase(Locale.ROOT);
        }

        List<UserVocabulary> items = userVocabularyRepository.searchUserVocabulary(
                userId,
                learned,
                normalizedLearnLevel,
                groupId,
                normalizedPos,
                fromDateTime,
                toDateTime,
                trimToNull(keyword)
        );

        sortUserVocabulary(items, sort);
        List<UserVocabulary> paged = applyPagination(items, page, size);

        return paged.stream()
                .map(uv -> toResponse(uv.getVocabulary(), uv))
                .toList();
    }

    @Override
    public void deleteUserVocabulary(Long id, Long userId) {
        UserVocabulary target = findUserVocabularyByAnyId(userId, id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy từ vựng đã lưu để xoá"));
        userVocabularyRepository.delete(target);
    }

    @Override
    public VocabularyResponse updateUserVocabularyStatus(Long userVocabularyId, Integer learnLevel, Long userId) {
        UserVocabulary userVocabulary = findUserVocabularyByAnyId(userId, userVocabularyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy từ vựng đã lưu"));

        int normalizedLearnLevel = normalizeLearnLevel(learnLevel);
        applyLearnLevel(userVocabulary, normalizedLearnLevel, true);

        UserVocabulary saved = userVocabularyRepository.save(userVocabulary);
        return toResponse(saved.getVocabulary(), saved);
    }

    @Override
    public VocabularyResponse updateUserVocabulary(Long userVocabularyId, UserVocabularyUpdateRequest request, Long userId) {
        UserVocabulary userVocabulary = findUserVocabularyByAnyId(userId, userVocabularyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy từ vựng đã lưu"));

        if (request.getGroupId() != null) {
            UserVocabularyGroup targetGroup = resolveTargetGroup(userId, request.getGroupId(), null);
            userVocabulary.setGroup(targetGroup);
        }

        if (request.getNote() != null) {
            userVocabulary.setNote(trimToNull(request.getNote()));
        }

        if (request.getLearnLevel() != null) {
            int current = userVocabulary.getLearnLevel() == null ? 0 : userVocabulary.getLearnLevel();
            int target = normalizeLearnLevel(request.getLearnLevel());
            applyLearnLevel(userVocabulary, target, current != target);
        }

        UserVocabulary saved = userVocabularyRepository.save(userVocabulary);
        return toResponse(saved.getVocabulary(), saved);
    }

    @Override
    public UserVocabularyBatchResultResponse batchSaveToUserVocabulary(UserVocabularyBatchSaveRequest request, Long userId) {
        LinkedHashSet<Long> uniqueIds = new LinkedHashSet<>(request.getVocabIds());

        int success = 0;
        int skipped = 0;
        int failed = 0;

        for (Long vocabId : uniqueIds) {
            try {
                if (vocabId == null) {
                    skipped++;
                    continue;
                }

                if (userVocabularyRepository.findByUserIdAndVocabularyId(userId, vocabId).isPresent()) {
                    skipped++;
                    continue;
                }

                SaveVocabularyRequest saveRequest = new SaveVocabularyRequest();
                saveRequest.setVocabId(vocabId);
                saveRequest.setGroupId(request.getGroupId());
                saveRequest.setGroupName(request.getGroupName());
                saveRequest.setNote(request.getNote());
                saveToUserVocabulary(saveRequest, userId);
                success++;
            } catch (RuntimeException ex) {
                failed++;
                log.warn("Batch save vocabulary failed for vocabId={}: {}", vocabId, ex.getMessage());
            }
        }

        return UserVocabularyBatchResultResponse.builder()
                .requested(uniqueIds.size())
                .success(success)
                .skipped(skipped)
                .failed(failed)
                .build();
    }

    @Override
    public UserVocabularyBatchResultResponse batchUpdateStatus(UserVocabularyBatchStatusRequest request, Long userId) {
        LinkedHashSet<Long> uniqueIds = new LinkedHashSet<>(request.getUserVocabularyIds());
        int normalizedLevel = normalizeLearnLevel(request.getLearnLevel());

        int success = 0;
        int skipped = 0;

        for (Long userVocabularyId : uniqueIds) {
            Optional<UserVocabulary> candidate = userVocabularyRepository.findByUserIdAndId(userId, userVocabularyId);
            if (candidate.isEmpty()) {
                skipped++;
                continue;
            }

            UserVocabulary userVocabulary = candidate.get();
            int current = userVocabulary.getLearnLevel() == null ? 0 : userVocabulary.getLearnLevel();
            applyLearnLevel(userVocabulary, normalizedLevel, current != normalizedLevel);
            success++;
        }

        return UserVocabularyBatchResultResponse.builder()
                .requested(uniqueIds.size())
                .success(success)
                .skipped(skipped)
                .failed(0)
                .build();
    }

    @Override
    public UserVocabularyBatchResultResponse batchDelete(UserVocabularyBatchDeleteRequest request, Long userId) {
        LinkedHashSet<Long> uniqueIds = new LinkedHashSet<>(request.getUserVocabularyIds());
        int success = 0;
        int skipped = 0;

        for (Long id : uniqueIds) {
            Optional<UserVocabulary> candidate = findUserVocabularyByAnyId(userId, id);
            if (candidate.isEmpty()) {
                skipped++;
                continue;
            }
            userVocabularyRepository.delete(candidate.get());
            success++;
        }

        return UserVocabularyBatchResultResponse.builder()
                .requested(uniqueIds.size())
                .success(success)
                .skipped(skipped)
                .failed(0)
                .build();
    }

    @Override
    @Transactional
    public List<UserVocabularyGroupResponse> getUserVocabularyGroups(Long userId) {
        ensureDefaultGroup(userId);
        return userVocabularyGroupRepository.findByUserIdOrderByCreatedAtAsc(userId).stream()
                .map(group -> UserVocabularyGroupResponse.builder()
                        .id(group.getId())
                        .name(group.getName())
                        .totalWords(userVocabularyRepository.countByUserIdAndGroupId(userId, group.getId()))
                        .createdAt(group.getCreatedAt())
                        .updatedAt(group.getUpdatedAt())
                        .build())
                .toList();
    }

    @Override
    public UserVocabularyGroupResponse createUserVocabularyGroup(UserVocabularyGroupCreateRequest request, Long userId) {
        String groupName = sanitizeGroupName(request.getName());
        String normalizedName = normalizeWord(groupName);

        if (userVocabularyGroupRepository.existsByUserIdAndNormalizedName(userId, normalizedName)) {
            throw new BadRequestException("Tên nhóm đã tồn tại");
        }

        User user = getUser(userId);
        UserVocabularyGroup group = UserVocabularyGroup.builder()
                .user(user)
                .name(groupName)
                .normalizedName(normalizedName)
                .build();

        UserVocabularyGroup saved = userVocabularyGroupRepository.save(group);
        return UserVocabularyGroupResponse.builder()
                .id(saved.getId())
                .name(saved.getName())
                .totalWords(0L)
                .createdAt(saved.getCreatedAt())
                .updatedAt(saved.getUpdatedAt())
                .build();
    }

    @Override
    public UserVocabularyGroupResponse renameUserVocabularyGroup(Long groupId, UserVocabularyGroupUpdateRequest request, Long userId) {
        UserVocabularyGroup group = userVocabularyGroupRepository.findByUserIdAndId(userId, groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhóm từ vựng"));

        String newName = sanitizeGroupName(request.getName());
        String normalized = normalizeWord(newName);

        if (!Objects.equals(group.getNormalizedName(), normalized)
                && userVocabularyGroupRepository.existsByUserIdAndNormalizedName(userId, normalized)) {
            throw new BadRequestException("Tên nhóm đã tồn tại");
        }

        group.setName(newName);
        group.setNormalizedName(normalized);
        UserVocabularyGroup saved = userVocabularyGroupRepository.save(group);

        return UserVocabularyGroupResponse.builder()
                .id(saved.getId())
                .name(saved.getName())
                .totalWords(userVocabularyRepository.countByUserIdAndGroupId(userId, saved.getId()))
                .createdAt(saved.getCreatedAt())
                .updatedAt(saved.getUpdatedAt())
                .build();
    }

    @Override
    public void deleteUserVocabularyGroup(Long groupId, Long userId) {
        UserVocabularyGroup group = userVocabularyGroupRepository.findByUserIdAndId(userId, groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhóm từ vựng"));

        if (DEFAULT_GROUP_NAME.equalsIgnoreCase(group.getName())) {
            throw new BadRequestException("Không thể xoá nhóm mặc định");
        }

        List<UserVocabulary> items = userVocabularyRepository.findByUserIdAndGroupId(userId, groupId);
        if (!items.isEmpty()) {
            userVocabularyRepository.deleteAll(items);
        }
        userVocabularyGroupRepository.delete(group);
    }

    private void sortUserVocabulary(List<UserVocabulary> items, String sort) {
        String sortKey = trimToNull(sort);
        if (sortKey == null) {
            sortKey = "newest";
        }

        Comparator<UserVocabulary> bySavedAtAsc = Comparator.comparing(UserVocabulary::getSavedAt,
                Comparator.nullsLast(LocalDateTime::compareTo));
        Comparator<UserVocabulary> byWordAsc = Comparator.comparing(
                uv -> getWordForSort(uv).toLowerCase(Locale.ROOT),
                Comparator.nullsLast(String::compareTo)
        );

        Comparator<UserVocabulary> comparator;
        switch (sortKey.toLowerCase(Locale.ROOT)) {
            case "oldest" -> comparator = bySavedAtAsc;
            case "az" -> comparator = byWordAsc;
            case "za" -> comparator = byWordAsc.reversed();
            case "status" -> comparator = Comparator
                    .comparing((UserVocabulary uv) -> uv.getLearnLevel() == null ? 0 : uv.getLearnLevel())
                    .thenComparing(byWordAsc);
            case "newest" -> comparator = bySavedAtAsc.reversed();
            default -> comparator = bySavedAtAsc.reversed();
        }
        items.sort(comparator);
    }

    private List<UserVocabulary> applyPagination(List<UserVocabulary> items, Integer page, Integer size) {
        if (size == null || size <= 0) {
            return items;
        }

        int safePage = page == null || page < 0 ? 0 : page;
        int safeSize = Math.min(Math.max(size, 1), 200);
        int fromIndex = safePage * safeSize;
        if (fromIndex >= items.size()) {
            return List.of();
        }
        int toIndex = Math.min(items.size(), fromIndex + safeSize);
        return items.subList(fromIndex, toIndex);
    }

    private Optional<UserVocabulary> findUserVocabularyByAnyId(Long userId, Long id) {
        if (id == null) {
            return Optional.empty();
        }
        Optional<UserVocabulary> byUserVocabularyId = userVocabularyRepository.findByUserIdAndId(userId, id);
        if (byUserVocabularyId.isPresent()) {
            return byUserVocabularyId;
        }
        return userVocabularyRepository.findByUserIdAndVocabularyId(userId, id);
    }

    private UserVocabularyGroup resolveTargetGroup(Long userId, Long groupId, String groupName) {
        if (groupId != null) {
            return userVocabularyGroupRepository.findByUserIdAndId(userId, groupId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhóm từ vựng"));
        }

        String cleanedName = trimToNull(groupName);
        if (cleanedName == null) {
            return ensureDefaultGroup(userId);
        }

        String normalized = normalizeWord(cleanedName);
        return userVocabularyGroupRepository.findByUserIdAndNormalizedName(userId, normalized)
                .orElseGet(() -> userVocabularyGroupRepository.save(UserVocabularyGroup.builder()
                        .user(getUser(userId))
                        .name(cleanedName)
                        .normalizedName(normalized)
                        .build()));
    }

    private UserVocabularyGroup ensureDefaultGroup(Long userId) {
        String normalized = normalizeWord(DEFAULT_GROUP_NAME);
        return userVocabularyGroupRepository.findByUserIdAndNormalizedName(userId, normalized)
                .orElseGet(() -> userVocabularyGroupRepository.save(UserVocabularyGroup.builder()
                        .user(getUser(userId))
                        .name(DEFAULT_GROUP_NAME)
                        .normalizedName(normalized)
                        .build()));
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
    }

    private void applyLearnLevel(UserVocabulary userVocabulary, int learnLevel, boolean reviewedNow) {
        userVocabulary.setLearnLevel(learnLevel);
        userVocabulary.setLearned(learnLevel >= 2);
        if (reviewedNow) {
            userVocabulary.setLastReviewedAt(LocalDateTime.now());
            Integer current = userVocabulary.getReviewCount() == null ? 0 : userVocabulary.getReviewCount();
            userVocabulary.setReviewCount(current + 1);

            // Ghi nhật ký học tập ôn tập Flashcard
            studyLogRepository.save(StudyLog.builder()
                    .user(userVocabulary.getUser())
                    .activity("FLASHCARD_REVIEW")
                    .detail(userVocabulary.getVocabulary().getWord())
                    .duration(1)
                    .createdAt(LocalDateTime.now())
                    .build());
        }
    }

    private int normalizeLearnLevel(Integer learnLevel) {
        if (learnLevel == null) {
            return 0;
        }
        if (learnLevel < 0 || learnLevel > 2) {
            throw new BadRequestException("learnLevel phải từ 0 đến 2");
        }
        return learnLevel;
    }

    private String sanitizeGroupName(String name) {
        String cleaned = trimToNull(name);
        if (cleaned == null) {
            throw new BadRequestException("Tên nhóm không hợp lệ");
        }
        if (cleaned.length() > 120) {
            throw new BadRequestException("Tên nhóm quá dài (tối đa 120 ký tự)");
        }
        return cleaned;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String cleaned = value.trim();
        return cleaned.isEmpty() ? null : cleaned;
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            String cleaned = trimToNull(value);
            if (cleaned != null) {
                return cleaned;
            }
        }
        return null;
    }

    private String normalizeWord(String word) {
        if (word == null) {
            return "";
        }
        return word.trim().toLowerCase(Locale.ROOT);
    }

    private VocabularyResponse toResponse(Vocabulary vocab, UserVocabulary userVocabulary) {
        Vocabulary effectiveVocab = vocab != null ? vocab : (userVocabulary == null ? null : userVocabulary.getVocabulary());
        Long vocabId = effectiveVocab == null ? null : effectiveVocab.getId();
        List<VocabularyResponse.ExampleDto> examples = vocabId == null
                ? List.of()
                : vocabularyExampleRepository.findByVocabularyId(vocabId).stream()
                .map(example -> VocabularyResponse.ExampleDto.builder()
                        .enSentence(example.getEnSentence())
                        .viSentence(example.getViSentence())
                        .source(example.getSource())
                        .build())
                .toList();

        UserVocabularyGroup group = userVocabulary == null ? null : userVocabulary.getGroup();
        Topic topic = effectiveVocab == null ? null : effectiveVocab.getTopic();
        Folder folder = topic == null ? null : topic.getFolder();

        return VocabularyResponse.builder()
                .id(effectiveVocab == null ? null : effectiveVocab.getId())
                .word(resolveWord(effectiveVocab, userVocabulary))
                .ipa(resolveIpa(effectiveVocab, userVocabulary))
                .partOfSpeech(resolvePartOfSpeech(effectiveVocab, userVocabulary))
                .meaning(resolveMeaning(effectiveVocab, userVocabulary))
                .viMeaning(resolveViMeaning(effectiveVocab, userVocabulary))
                .audioUrl(effectiveVocab == null ? null : effectiveVocab.getAudioUrl())
                .imageUrl(effectiveVocab == null ? null : effectiveVocab.getImageUrl())
                .related(effectiveVocab == null ? null : effectiveVocab.getRelated())
                .topicId(topic == null ? null : topic.getId())
                .topicName(topic == null ? null : topic.getName())
                .folderId(folder == null ? null : folder.getId())
                .folderName(folder == null ? null : folder.getName())
                .examples(examples)
                .isSaved(userVocabulary != null)
                .userVocabularyId(userVocabulary == null ? null : userVocabulary.getId())
                .learned(userVocabulary == null ? null : Boolean.TRUE.equals(userVocabulary.getLearned()))
                .learnLevel(userVocabulary == null ? null : userVocabulary.getLearnLevel())
                .note(userVocabulary == null ? null : userVocabulary.getNote())
                .groupId(group == null ? null : group.getId())
                .groupName(group == null ? null : group.getName())
                .lastReviewedAt(userVocabulary == null ? null : userVocabulary.getLastReviewedAt())
                .reviewCount(userVocabulary == null ? null : userVocabulary.getReviewCount())
                .savedAt(userVocabulary == null ? null : userVocabulary.getSavedAt())
                .build();
    }

    private String getWordForSort(UserVocabulary userVocabulary) {
        if (userVocabulary == null) {
            return "";
        }
        if (userVocabulary.getVocabulary() != null && userVocabulary.getVocabulary().getWord() != null) {
            return userVocabulary.getVocabulary().getWord();
        }
        return userVocabulary.getCustomWord() == null ? "" : userVocabulary.getCustomWord();
    }

    private String resolveWord(Vocabulary vocab, UserVocabulary userVocabulary) {
        return vocab != null ? vocab.getWord() : userVocabulary == null ? null : userVocabulary.getCustomWord();
    }

    private String resolveIpa(Vocabulary vocab, UserVocabulary userVocabulary) {
        return vocab != null ? vocab.getIpa() : userVocabulary == null ? null : userVocabulary.getCustomIpa();
    }

    private String resolvePartOfSpeech(Vocabulary vocab, UserVocabulary userVocabulary) {
        return vocab != null ? vocab.getPartOfSpeech() : userVocabulary == null ? null : userVocabulary.getCustomPartOfSpeech();
    }

    private String resolveMeaning(Vocabulary vocab, UserVocabulary userVocabulary) {
        return vocab != null ? vocab.getMeaning() : userVocabulary == null ? null : userVocabulary.getCustomMeaning();
    }

    private String resolveViMeaning(Vocabulary vocab, UserVocabulary userVocabulary) {
        return vocab != null ? vocab.getViMeaning() : userVocabulary == null ? null : userVocabulary.getCustomViMeaning();
    }
}



