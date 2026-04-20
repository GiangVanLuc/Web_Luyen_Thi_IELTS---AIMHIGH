package vn.aimhigh.aimhighbackend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

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
    @JoinColumn(name = "vocab_id", nullable = false)
    private Vocabulary vocabulary;

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
}
