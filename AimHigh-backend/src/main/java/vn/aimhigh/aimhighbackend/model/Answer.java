package vn.aimhigh.aimhighbackend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "answers")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Answer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id")
    private Attempt attempt;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id")
    private Question question;
    
    @Column(name = "answer_text", columnDefinition = "TEXT")
    private String answerText;
    
    @Column(name = "is_correct")
    private Boolean isCorrect;
    
    @Column(name = "is_skipped")
    private Boolean isSkipped;
}
