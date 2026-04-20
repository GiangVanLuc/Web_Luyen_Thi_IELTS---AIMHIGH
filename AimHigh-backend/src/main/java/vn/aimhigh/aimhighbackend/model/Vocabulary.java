package vn.aimhigh.aimhighbackend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.List;

@Entity
@Table(
    name = "vocabulary",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_vocabulary_normalized_word", columnNames = {"normalized_word"})
    },
    indexes = {
        @Index(name = "idx_vocabulary_normalized_word", columnList = "normalized_word")
    }
)
@Getter
@Setter
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
    
    @Column(nullable = false)
    private String word;

    @Column(name = "normalized_word", nullable = false)
    private String normalizedWord;

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
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @OneToMany(mappedBy = "vocabulary", cascade = CascadeType.ALL)
    private List<VocabularyExample> examples;

    @PrePersist
    protected void onCreate() {
        normalizeWord();
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        normalizeWord();
    }

    private void normalizeWord() {
        if (word != null) {
            word = word.trim();
            normalizedWord = word.toLowerCase(Locale.ROOT);
        }
    }
}
