package vn.aimhigh.aimhighbackend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "highlights",
    indexes = {
        @Index(name = "idx_highlights_attempt_passage_user_created", columnList = "attempt_id, passage_id, user_id, created_at")
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Highlight {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id", nullable = false)
    private Attempt attempt;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "passage_id", nullable = false)
    private ReadingPassage readingPassage;
    
    @Column(name = "start_offset", nullable = false)
    private Integer startOffset;
    
    @Column(name = "end_offset", nullable = false)
    private Integer endOffset;
    
    @Builder.Default
    @Column(nullable = false)
    private String color = "hl-y";
    
    @Column(columnDefinition = "TEXT")
    private String note;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (color == null || color.isBlank()) {
            color = "hl-y";
        }
        createdAt = LocalDateTime.now();
    }
}
