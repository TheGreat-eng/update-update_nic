// TẠO FILE MỚI: src/main/java/com/example/iotserver/dto/PlantProfileDTO.java
package com.example.iotserver.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlantProfileDTO {
    private Long id;
    private String name;
    private String scientificName;
    private String description;
    // Map để nhận và gửi các cài đặt một cách linh hoạt
    // Ví dụ: {"PLANT_HEALTH_HEAT_STRESS_THRESHOLD": "32.0"}
    private Map<String, String> settings;
}