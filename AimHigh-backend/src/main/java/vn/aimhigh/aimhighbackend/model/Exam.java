package vn.aimhigh.aimhighbackend.model;

import jakarta.persistence.*;
import lombok.*;
import vn.aimhigh.aimhighbackend.enums.*;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(
    name = "exams",
    indexes = {
        @Index(name = "idx_exams_skill_level_status", columnList = "skill, level, status")
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Exam {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String title;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Skill skill;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ExamType type;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ExamLevel level;
    
    private Integer duration;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    private String thumbnail;
    
    @Column(name = "exam_data", columnDefinition = "LONGTEXT")
    private String examData;
    
    @Builder.Default
    @Enumerated(EnumType.STRING)
    private ExamStatus status = ExamStatus.PUBLISHED;
    
    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_id")
    private Source source;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @OneToMany(mappedBy = "exam", cascade = CascadeType.ALL)
    private List<ListeningPart> listeningParts;
    
    @OneToMany(mappedBy = "exam", cascade = CascadeType.ALL)
    private List<ReadingPassage> readingPassages;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
