package com.example.iotserver.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SettingDTO {
    private String key;
    private String value;
    private String description; // Mô tả từ cài đặt hệ thống
}