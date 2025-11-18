// TẠO FILE MỚI: src/main/java/com/example/iotserver/dto/ZoneHealthDTO.java
package com.example.iotserver.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ZoneHealthDTO {
    private Long zoneId;
    private String zoneName;
    private String plantProfileName; // Tên hồ sơ đang áp dụng
    private Integer healthScore;
    private String status; // EXCELLENT, GOOD, ...
    private int activeAlertCount;
    private List<PlantHealthDTO.AlertDTO> criticalAlerts; // Top cảnh báo quan trọng
}