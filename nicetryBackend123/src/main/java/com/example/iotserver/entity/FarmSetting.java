package com.example.iotserver.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "farm_settings")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FarmSetting {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "farm_id", nullable = false)
    private Farm farm;

    @Column(name = "setting_key", nullable = false)
    private String key;

    @Column(name = "setting_value", nullable = false, columnDefinition = "TEXT")
    private String value;
}