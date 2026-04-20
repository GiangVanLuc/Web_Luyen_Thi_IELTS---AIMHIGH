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
    
    @Builder.Default
    @Column(nullable = false)
    private Boolean learned = Boolean.FALSE;
    
    @Column(columnDefinition = "TEXT")
    private String note;
    
    @Column(name = "saved_at", nullable = false)
    private LocalDateTime savedAt;

    @PrePersist
    protected void onCreate() {
        if (learned == null) {
            learned = Boolean.FALSE;
        }
        savedAt = LocalDateTime.now();
    }
}
