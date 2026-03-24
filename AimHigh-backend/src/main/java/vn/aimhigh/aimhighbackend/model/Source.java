package vn.aimhigh.aimhighbackend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "sources")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Source {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
}
