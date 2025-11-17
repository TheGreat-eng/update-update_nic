package com.example.iotserver.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor // <<< THÊM DÒNG NÀY
@AllArgsConstructor // <<< THÊM DÒNG NÀY
public class ScheduleDTO {
    private Long id;
    private String name;
    private String description;
    private Long farmId;
    private String deviceId;
    private String deviceName; // Thêm để hiển thị trên UI
    private String action;
    private String cronExpression;
    private Integer durationSeconds;
    private boolean enabled;
}