package vn.aimhigh.aimhighbackend.model;

import jakarta.persistence.*;
import lombok.*;
import vn.aimhigh.aimhighbackend.enums.QuestionTypeName;

@Entity
@Table(name = "question_types")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionType {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Enumerated(EnumType.STRING)
    private QuestionTypeName name;
    
    private String description;
}
