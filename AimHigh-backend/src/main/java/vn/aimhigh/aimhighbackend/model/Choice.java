package vn.aimhigh.aimhighbackend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "choices")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Choice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id")
    private Question question;
    
    @Column(name = "choice_label")
    private String choiceLabel;
    
    @Column(name = "choice_text", columnDefinition = "TEXT")
    private String choiceText;
    
    @Column(name = "is_correct")
    private Boolean isCorrect;
}
