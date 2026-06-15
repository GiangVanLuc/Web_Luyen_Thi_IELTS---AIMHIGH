package vn.aimhigh.aimhighbackend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "audit_logs")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false)
    private LocalDateTime timestamp;

    @Column(name = "account_email")
    private String accountEmail;

    @Column(nullable = false)
    private String action;

    @Column(nullable = false)
    private String target;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(nullable = false)
    private String result;

    @PrePersist
    protected void onCreate() {
        if (this.timestamp == null) {
            this.timestamp = LocalDateTime.now();
        }
    }
}
