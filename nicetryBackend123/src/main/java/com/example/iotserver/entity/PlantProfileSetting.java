// TẠO FILE MỚI: src/main/java/com/example/iotserver/entity/PlantProfileSetting.java
package com.example.iotserver.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "plant_profile_settings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlantProfileSetting {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profile_id", nullable = false)
    private PlantProfile profile;

    @Column(name = "setting_key", nullable = false)
    private String key;

    @Column(name = "setting_value", nullable = false)
    private String value;
}