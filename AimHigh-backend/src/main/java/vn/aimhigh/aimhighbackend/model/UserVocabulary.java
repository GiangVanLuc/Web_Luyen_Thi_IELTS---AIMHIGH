package vn.aimhigh.aimhighbackend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_vocabulary")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserVocabulary {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vocab_id")
    private Vocabulary vocabulary;
    
    private Boolean learned;
    
    @Column(columnDefinition = "TEXT")
    private String note;
    
    @Column(name = "saved_at")
    private LocalDateTime savedAt;

    @PrePersist
    protected void onCreate() {
        savedAt = LocalDateTime.now();
    }
}
