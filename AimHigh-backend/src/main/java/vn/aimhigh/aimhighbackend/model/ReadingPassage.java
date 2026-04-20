package vn.aimhigh.aimhighbackend.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;

@Entity
@Table(
    name = "reading_passages",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_reading_passages_exam_section_order", columnNames = {"exam_id", "section_number", "passage_order_in_section"})
    },
    indexes = {
        @Index(name = "idx_reading_passages_exam_section_order", columnList = "exam_id, section_number, passage_order_in_section"),
        @Index(name = "idx_reading_passages_exam_legacy_order", columnList = "exam_id, passage_order")
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReadingPassage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
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

    @Column(name = "section_number")
    private Integer sectionNumber;

    @Column(name = "passage_order_in_section")
    private Integer passageOrderInSection;
    
    @OneToMany(mappedBy = "readingPassage", cascade = CascadeType.ALL)
    private List<Question> questions;

    @PrePersist
    @PreUpdate
    protected void syncOrderFields() {
        if ((sectionNumber == null || sectionNumber <= 0 || passageOrderInSection == null || passageOrderInSection <= 0)
                && passageOrder != null && passageOrder > 0) {
            if (sectionNumber == null || sectionNumber <= 0) {
                sectionNumber = passageOrder >= 10 ? passageOrder / 10 : passageOrder;
            }
            if (passageOrderInSection == null || passageOrderInSection <= 0) {
                if (passageOrder >= 10) {
                    int derivedOrder = passageOrder % 10;
                    passageOrderInSection = derivedOrder == 0 ? 1 : derivedOrder;
                } else {
                    passageOrderInSection = 1;
                }
            }
        }

        if (sectionNumber != null && sectionNumber > 0 && passageOrderInSection != null && passageOrderInSection > 0) {
            passageOrder = sectionNumber * 10 + passageOrderInSection;
        }
    }

    public Integer getEffectiveSectionNumber() {
        if (sectionNumber != null && sectionNumber > 0) {
            return sectionNumber;
        }
        if (passageOrder == null || passageOrder <= 0) {
            return null;
        }
        return passageOrder >= 10 ? passageOrder / 10 : passageOrder;
    }

    public Integer getEffectivePassageOrderInSection() {
        if (passageOrderInSection != null && passageOrderInSection > 0) {
            return passageOrderInSection;
        }
        if (passageOrder == null || passageOrder <= 0) {
            return null;
        }
        if (passageOrder >= 10) {
            int derivedOrder = passageOrder % 10;
            return derivedOrder == 0 ? 1 : derivedOrder;
        }
        return 1;
    }
}
