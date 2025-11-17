// src/main/java/com/example/iotserver/dto/ZoneDTO.java
package com.example.iotserver.dto;

import lombok.AllArgsConstructor; // THÊM IMPORT NÀY
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor; // THÊM IMPORT NÀY

@Data
@Builder
@NoArgsConstructor // VVVV--- THÊM DÒNG NÀY ---VVVV
@AllArgsConstructor // VVVV--- THÊM DÒNG NÀY ---VVVV
public class ZoneDTO {
    private Long id;
    private String name;
    private String description;
    private Long farmId;
    private Long deviceCount;
}