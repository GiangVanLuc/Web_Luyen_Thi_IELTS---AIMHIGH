package vn.aimhigh.aimhighbackend.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;

@Entity
@Table(name = "listening_parts")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ListeningPart {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id")
    private Exam exam;
    
    @Column(name = "part_number")
    private Integer partNumber;
    
    private String title;
    
    @Column(name = "audio_url")
    private String audioUrl;
    
    @Column(name = "audio_duration")
    private Integer audioDuration;
    
    @Column(columnDefinition = "TEXT")
    private String transcript;
    
    @Column(name = "part_order")
    private Integer partOrder;
    
    @OneToMany(mappedBy = "listeningPart", cascade = CascadeType.ALL)
    private List<Question> questions;
}
