package vn.aimhigh.aimhighbackend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.Locale;
import vn.aimhigh.aimhighbackend.enums.VocabularySourceType;

@Entity
@Table(
    name = "user_vocabulary",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_vocabulary_user_vocab", columnNames = {"user_id", "vocab_id"})
    },
    indexes = {
        @Index(name = "idx_user_vocabulary_user_id", columnList = "user_id")
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserVocabulary {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vocab_id")
    private Vocabulary vocabulary;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "source_type")
    private VocabularySourceType sourceType = VocabularySourceType.GLOBAL;

    @Column(name = "custom_word")
    private String customWord;

    @Column(name = "custom_normalized_word")
    private String customNormalizedWord;

    @Column(name = "custom_ipa")
    private String customIpa;

    @Column(name = "custom_part_of_speech")
    private String customPartOfSpeech;

    @Column(name = "custom_meaning", columnDefinition = "TEXT")
    private String customMeaning;

    @Column(name = "custom_vi_meaning", columnDefinition = "TEXT")
    private String customViMeaning;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private UserVocabularyGroup group;
    
    @Builder.Default
    @Column(nullable = false)
    private Boolean learned = Boolean.FALSE;

    @Builder.Default
    @Column(name = "learn_level", nullable = false)
    private Integer learnLevel = 0;
    
    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "last_reviewed_at")
    private LocalDateTime lastReviewedAt;

    @Builder.Default
    @Column(name = "review_count", nullable = false)
    private Integer reviewCount = 0;
    
    @Column(name = "saved_at", nullable = false)
    private LocalDateTime savedAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        syncSourceType();
        syncLearnState();
        if (learned == null) {
            learned = Boolean.FALSE;
        }
        if (learnLevel == null) {
            learnLevel = Boolean.FALSE.equals(learned) ? 0 : 2;
        }
        if (reviewCount == null) {
            reviewCount = 0;
        }
        savedAt = LocalDateTime.now();
        updatedAt = savedAt;
    }

    @PreUpdate
    protected void onUpdate() {
        syncSourceType();
        syncLearnState();
        if (reviewCount == null) {
            reviewCount = 0;
        }
        updatedAt = LocalDateTime.now();
    }

    private void syncLearnState() {
        if (learnLevel == null) {
            learnLevel = Boolean.TRUE.equals(learned) ? 2 : 0;
        }
        if (learnLevel < 0) {
            learnLevel = 0;
        }
        if (learnLevel > 2) {
            learnLevel = 2;
        }
        learned = learnLevel >= 2;
    }

    private void syncSourceType() {
        if (sourceType == null) {
            sourceType = vocabulary == null ? VocabularySourceType.CUSTOM : VocabularySourceType.GLOBAL;
        }
        if (sourceType == VocabularySourceType.CUSTOM && customWord != null) {
            customWord = customWord.trim();
            customNormalizedWord = customWord.toLowerCase(Locale.ROOT);
        }
    }
}
