package vn.aimhigh.aimhighbackend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "highlights")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Highlight {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id")
    private Attempt attempt;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "passage_id")
    private ReadingPassage readingPassage;
    
    @Column(name = "start_offset")
    private Integer startOffset;
    
    @Column(name = "end_offset")
    private Integer endOffset;
    
    private String color;
    
    @Column(columnDefinition = "TEXT")
    private String note;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
