package vn.aimhigh.aimhighbackend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "map_labels")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MapLabel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id")
    private Question question;
    
    @Column(name = "image_url")
    private String imageUrl;
    
    @Column(name = "position_x")
    private Double positionX;
    
    @Column(name = "position_y")
    private Double positionY;
    
    @Column(name = "correct_label")
    private String correctLabel;
}
