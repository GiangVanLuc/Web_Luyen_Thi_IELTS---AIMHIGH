package vn.aimhigh.aimhighbackend.service.impl;

import vn.aimhigh.aimhighbackend.service.VocabularyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import vn.aimhigh.aimhighbackend.dto.request.SaveVocabularyRequest;
import vn.aimhigh.aimhighbackend.dto.response.VocabularyResponse;
import vn.aimhigh.aimhighbackend.exception.BadRequestException;

import java.util.List;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class VocabularyServiceImpl implements VocabularyService {
    private final vn.aimhigh.aimhighbackend.repository.VocabularyRepository vocabularyRepository;
    private final vn.aimhigh.aimhighbackend.repository.UserVocabularyRepository userVocabularyRepository;
    private final vn.aimhigh.aimhighbackend.repository.UserRepository userRepository;

    public VocabularyResponse lookup(String word, Long userId) {
        String normalizedWord = normalizeWord(word);
        if (normalizedWord.isBlank()) {
            throw new BadRequestException("Invalid vocabulary word");
        }

        vn.aimhigh.aimhighbackend.model.Vocabulary vocab = vocabularyRepository.findByNormalizedWord(normalizedWord).orElseGet(() -> {
            vn.aimhigh.aimhighbackend.model.Vocabulary newVocab = vn.aimhigh.aimhighbackend.model.Vocabulary.builder()
                    .word(word.trim())
                    .build();
            return vocabularyRepository.save(newVocab);
        });

        boolean isSaved = userVocabularyRepository.findByUserIdAndVocabularyId(userId, vocab.getId()).isPresent();

        return VocabularyResponse.builder()
                .id(vocab.getId())
                .word(vocab.getWord())
                .ipa(vocab.getIpa())
                .partOfSpeech(vocab.getPartOfSpeech())
                .meaning(vocab.getMeaning())
                .viMeaning(vocab.getViMeaning())
                .audioUrl(vocab.getAudioUrl())
                .imageUrl(vocab.getImageUrl())
                .related(vocab.getRelated())
                .isSaved(isSaved)
                .build();
    }

    public void saveToUserVocabulary(SaveVocabularyRequest request, Long userId) {
        if (userVocabularyRepository.findByUserIdAndVocabularyId(userId, request.getVocabId()).isPresent()) {
            return;
        }
        vn.aimhigh.aimhighbackend.model.User user = userRepository.findById(userId).orElseThrow();
        vn.aimhigh.aimhighbackend.model.Vocabulary vocab = vocabularyRepository.findById(request.getVocabId()).orElseThrow();
        
        vn.aimhigh.aimhighbackend.model.UserVocabulary userVocab = vn.aimhigh.aimhighbackend.model.UserVocabulary.builder()
                .user(user)
                .vocabulary(vocab)
                .learned(false)
                .note(request.getNote())
                .build();
        userVocabularyRepository.save(userVocab);
    }

    public List<VocabularyResponse> getUserVocabulary(Long userId, Boolean learned) {
        return userVocabularyRepository.findByUserId(userId).stream()
                .filter(uv -> learned == null || learned.equals(Boolean.TRUE.equals(uv.getLearned())))
                .map(uv -> {
                    vn.aimhigh.aimhighbackend.model.Vocabulary v = uv.getVocabulary();
                    return VocabularyResponse.builder()
                            .id(v.getId())
                            .word(v.getWord())
                            .ipa(v.getIpa())
                            .partOfSpeech(v.getPartOfSpeech())
                            .meaning(v.getMeaning())
                            .viMeaning(v.getViMeaning())
                            .isSaved(true)
                            .userVocabularyId(uv.getId())
                            .learned(Boolean.TRUE.equals(uv.getLearned()))
                            .note(uv.getNote())
                            .savedAt(uv.getSavedAt())
                            .build();
                }).toList();
    }

    private String normalizeWord(String word) {
        if (word == null) {
            return "";
        }
        return word.trim().toLowerCase(Locale.ROOT);
    }

    public void deleteUserVocabulary(Long id, Long userId) {
        userVocabularyRepository.findByUserIdAndVocabularyId(userId, id)
                .ifPresentOrElse(
                        userVocabularyRepository::delete,
                        () -> userVocabularyRepository.findById(id).ifPresent(uv -> {
                            if (uv.getUser().getId().equals(userId)) {
                                userVocabularyRepository.delete(uv);
                            }
                        })
                );
    }
}



