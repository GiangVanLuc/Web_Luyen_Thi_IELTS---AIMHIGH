package vn.aimhigh.aimhighbackend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Locale;

@Entity
@Table(
    name = "user_vocabulary_group",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_vocab_group_name", columnNames = {"user_id", "normalized_name"})
    },
    indexes = {
        @Index(name = "idx_user_vocab_group_user", columnList = "user_id"),
        @Index(name = "idx_user_vocab_group_name", columnList = "normalized_name")
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserVocabularyGroup {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String name;

    @Column(name = "normalized_name", nullable = false)
    private String normalizedName;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        normalizeName();
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        normalizeName();
        updatedAt = LocalDateTime.now();
    }

    private void normalizeName() {
        if (name == null) {
            name = "Sổ từ vựng";
        }
        name = name.trim();
        if (name.isBlank()) {
            name = "Sổ từ vựng";
        }
        normalizedName = name.toLowerCase(Locale.ROOT);
    }
}
