package vn.aimhigh.aimhighbackend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;
import vn.aimhigh.aimhighbackend.enums.*;

@Entity
@Table(
    name = "attempts",
    indexes = {
        @Index(name = "idx_attempts_user_exam_status", columnList = "user_id, exam_id, status"),
        @Index(name = "idx_attempts_user_started_at", columnList = "user_id, started_at")
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Attempt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;
    
    @Enumerated(EnumType.STRING)
    private AttemptMode mode;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AttemptStatus status;
    
    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;
    
    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;
    
    @Column(name = "time_spent")
    private Integer timeSpent;
    
    @Column(name = "total_correct")
    private Integer totalCorrect;
    
    @Column(name = "total_wrong")
    private Integer totalWrong;
    
    private Double score;
    
    @Column(name = "band_score")
    private Double bandScore;
    
    @Column(columnDefinition = "LONGTEXT")
    private String feedback;
    
    @OneToMany(mappedBy = "attempt", cascade = CascadeType.ALL)
    private List<Answer> answers;

    @PrePersist
    protected void onCreate() {
        startedAt = LocalDateTime.now();
    }
}
