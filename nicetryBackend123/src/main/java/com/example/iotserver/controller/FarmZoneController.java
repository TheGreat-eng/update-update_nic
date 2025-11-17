// Đổi tên file thành FarmZoneController.java
package com.example.iotserver.controller;

import com.example.iotserver.dto.ZoneDTO;
import com.example.iotserver.dto.response.ApiResponse;
import com.example.iotserver.service.ZoneService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/farms/{farmId}/zones") // Giữ nguyên mapping này
@RequiredArgsConstructor
public class FarmZoneController {
    private final ZoneService zoneService;

    @PostMapping
    public ResponseEntity<ApiResponse<ZoneDTO>> createZone(@PathVariable Long farmId, @RequestBody ZoneDTO zoneDTO) {
        ZoneDTO createdZone = zoneService.createZone(farmId, zoneDTO);
        return ResponseEntity.ok(ApiResponse.success("Tạo vùng thành công", createdZone));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ZoneDTO>>> getZonesByFarm(@PathVariable Long farmId) {
        List<ZoneDTO> zones = zoneService.getZonesByFarm(farmId);
        return ResponseEntity.ok(ApiResponse.success(zones));
    }
}