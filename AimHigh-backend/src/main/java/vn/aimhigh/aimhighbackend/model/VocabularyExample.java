package vn.aimhigh.aimhighbackend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "vocabulary_examples")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VocabularyExample {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vocab_id")
    private Vocabulary vocabulary;
    
    @Column(name = "en_sentence", columnDefinition = "TEXT")
    private String enSentence;
    
    @Column(name = "vi_sentence", columnDefinition = "TEXT")
    private String viSentence;
    
    private String source;
}
