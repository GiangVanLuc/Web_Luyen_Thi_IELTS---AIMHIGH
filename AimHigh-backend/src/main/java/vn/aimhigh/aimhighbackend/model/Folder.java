package vn.aimhigh.aimhighbackend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Locale;

/**
 * Thư mục (cấp 1) để gom các chủ đề (Topic) của kho từ vựng AimHigh Pick.
 * Cấu trúc: Folder (thư mục) 1—* Topic (chủ đề) 1—* Vocabulary.
 */
@Entity
@Table(
    name = "vocabulary_folder",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_vocab_folder_normalized_name", columnNames = {"normalized_name"})
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Folder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "normalized_name", nullable = false)
    private String normalizedName;

    @Column(name = "display_order")
    private Integer displayOrder;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        normalize();
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (displayOrder == null) {
            displayOrder = 0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        normalize();
    }

    private void normalize() {
        if (name != null) {
            name = name.trim();
            normalizedName = name.toLowerCase(Locale.ROOT);
        }
    }
}
