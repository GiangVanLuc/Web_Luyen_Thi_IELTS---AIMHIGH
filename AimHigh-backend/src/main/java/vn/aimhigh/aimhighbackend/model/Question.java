package vn.aimhigh.aimhighbackend.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;

@Entity
@Table(name = "questions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Question {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id")
    private Exam exam;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "listening_part_id")
    private ListeningPart listeningPart;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reading_passage_id")
    private ReadingPassage readingPassage;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_type_id")
    private QuestionType questionType;
    
    @Column(name = "question_number")
    private Integer questionNumber;
    
    @Column(name = "question_text", columnDefinition = "TEXT")
    private String questionText;
    
    @Column(name = "correct_answer", columnDefinition = "TEXT")
    private String correctAnswer;
    
    @Column(columnDefinition = "TEXT")
    private String explanation;
    
    @Column(name = "audio_start")
    private Integer audioStart;
    
    @Column(name = "audio_end")
    private Integer audioEnd;
    
    private Double points;
    
    @Column(name = "question_order")
    private Integer questionOrder;
    
    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL)
    private List<Choice> choices;
    
    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL)
    private List<MatchingItem> matchingItems;
    
    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL)
    private List<MapLabel> mapLabels;
}
