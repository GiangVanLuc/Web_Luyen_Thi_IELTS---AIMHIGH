package vn.aimhigh.aimhighbackend.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;

@Entity
@Table(
    name = "questions",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_questions_exam_question_number", columnNames = {"exam_id", "question_number"})
    },
    indexes = {
        @Index(name = "idx_questions_exam_id", columnList = "exam_id"),
        @Index(name = "idx_questions_listening_part_id", columnList = "listening_part_id"),
        @Index(name = "idx_questions_reading_passage_id", columnList = "reading_passage_id")
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Question {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
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
    
    @Column(name = "question_number", nullable = false)
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
