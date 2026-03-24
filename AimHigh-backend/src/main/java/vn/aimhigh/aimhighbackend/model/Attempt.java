package vn.aimhigh.aimhighbackend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;
import vn.aimhigh.aimhighbackend.enums.*;

@Entity
@Table(name = "attempts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Attempt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id")
    private Exam exam;
    
    @Enumerated(EnumType.STRING)
    private AttemptMode mode;
    
    @Enumerated(EnumType.STRING)
    private AttemptStatus status;
    
    @Column(name = "started_at")
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
    
    @OneToMany(mappedBy = "attempt", cascade = CascadeType.ALL)
    private List<Answer> answers;

    @PrePersist
    protected void onCreate() {
        startedAt = LocalDateTime.now();
    }
}
