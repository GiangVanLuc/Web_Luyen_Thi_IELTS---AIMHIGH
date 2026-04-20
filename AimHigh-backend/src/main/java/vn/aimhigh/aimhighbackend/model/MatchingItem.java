package vn.aimhigh.aimhighbackend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "matching_items")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchingItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id")
    private Question question;
    
    @Column(name = "left_text", columnDefinition = "TEXT")
    private String leftText;
    
    @Column(name = "right_text", columnDefinition = "TEXT")
    private String rightText;
    
    @Column(name = "is_correct")
    private Boolean isCorrect;
}
