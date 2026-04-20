package vn.aimhigh.aimhighbackend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import vn.aimhigh.aimhighbackend.enums.Skill;

@Entity
@Table(
    name = "user_progress",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_progress_user_skill", columnNames = {"user_id", "skill"})
    },
    indexes = {
        @Index(name = "idx_user_progress_user_id", columnList = "user_id")
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProgress {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Skill skill;
    
    @Column(name = "total_attempts")
    private Integer totalAttempts;
    
    @Column(name = "avg_band_score")
    private Double avgBandScore;
    
    @Column(name = "best_band_score")
    private Double bestBandScore;
    
    @Column(name = "total_time_spent")
    private Integer totalTimeSpent;
    
    @Column(name = "last_practiced_at")
    private LocalDateTime lastPracticedAt;
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
