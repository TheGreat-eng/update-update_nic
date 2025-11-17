package com.example.iotserver.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "activity_logs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long farmId;

    private Long userId; // User thực hiện, null nếu là hệ thống

    @Column(nullable = false)
    private String actorName; // Tên user hoặc "Hệ thống"

    @Column(nullable = false)
    private String actionType; // DEVICE_CONTROL, RULE_UPDATE...

    private String targetType; // DEVICE, RULE...
    private String targetId; // ID của đối tượng

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LogStatus status;

    @Column(columnDefinition = "TEXT")
    private String details; // JSON

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum LogStatus {
        SUCCESS, FAILED
    }
}