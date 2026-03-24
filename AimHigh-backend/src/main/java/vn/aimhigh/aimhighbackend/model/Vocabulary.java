package vn.aimhigh.aimhighbackend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "vocabulary")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Vocabulary {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_id")
    private Topic topic;
    
    private String word;
    private String pronunciation;
    
    @Column(name = "part_of_speech")
    private String partOfSpeech;
    
    @Column(columnDefinition = "TEXT")
    private String meaning;
    
    @Column(name = "vi_meaning", columnDefinition = "TEXT")
    private String viMeaning;
    
    private String ipa;
    
    @Column(name = "audio_url")
    private String audioUrl;
    
    @Column(name = "image_url")
    private String imageUrl;
    
    @Column(columnDefinition = "TEXT")
    private String related;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @OneToMany(mappedBy = "vocabulary", cascade = CascadeType.ALL)
    private List<VocabularyExample> examples;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
