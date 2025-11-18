// TẠO FILE MỚI: src/main/java/com/example/iotserver/dto/SettingDTO.java
package com.example.iotserver.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SettingDTO {
    private String key;
    private String value; // Giá trị do người dùng tự đặt, có thể là null
    private String defaultValue; // Giá trị được kế thừa
    private String source; // Nguồn của giá trị mặc định, vd: "Hồ sơ: Cà chua"
    private String description;
}