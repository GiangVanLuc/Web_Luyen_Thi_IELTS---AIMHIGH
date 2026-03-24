package vn.aimhigh.aimhighbackend.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;

@Entity
@Table(name = "reading_passages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReadingPassage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id")
    private Exam exam;
    
    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String content;
    
    @Column(name = "image_url")
    private String imageUrl;
    
    @Column(name = "word_count")
    private Integer wordCount;
    
    @Column(name = "passage_order")
    private Integer passageOrder;
    
    @OneToMany(mappedBy = "readingPassage", cascade = CascadeType.ALL)
    private List<Question> questions;
}
