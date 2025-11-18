// TẠO FILE MỚI: src/main/java/com/example/iotserver/dto/PlantProfileSummaryDTO.java
package com.example.iotserver.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlantProfileSummaryDTO {
    private Long id;
    private String name;
    private String description;
}