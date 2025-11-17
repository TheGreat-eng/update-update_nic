// src/main/java/com/example/iotserver/entity/Notification.java
package com.example.iotserver.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import org.hibernate.annotations.CreationTimestamp; // VVVV--- THÊM IMPORT NÀY ---VVVV

@Entity
@Table(name = "notifications")
@Data
@Builder
@NoArgsConstructor // VVVV--- THÊM DÒNG NÀY ---VVVV
@AllArgsConstructor // VVVV--- THÊM DÒNG NÀY ---VVVV
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    private NotificationType type;

    private String link; // URL để click vào, ví dụ: /devices/123

    @Builder.Default
    private boolean isRead = false;

    // VVVV--- THAY THẾ DÒNG CŨ BẰNG 2 DÒNG NÀY ---VVVV
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // ^^^^-------------------------------------------^^^^
    public enum NotificationType {
        PLANT_HEALTH_ALERT,
        RULE_TRIGGERED,
        DEVICE_STATUS,
        SYSTEM_INFO
    }
}