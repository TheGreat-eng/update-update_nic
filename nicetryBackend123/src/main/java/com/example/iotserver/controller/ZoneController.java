package com.example.iotserver.controller;

import com.example.iotserver.dto.ZoneDTO;
import com.example.iotserver.dto.response.ApiResponse;
import com.example.iotserver.service.ZoneService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/zones") // URL base là /api/zones
@RequiredArgsConstructor
public class ZoneController {

    private final ZoneService zoneService;

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ZoneDTO>> getZoneById(@PathVariable Long id) {
        ZoneDTO zone = zoneService.getZoneById(id); // Cần tạo phương thức này trong service
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin vùng thành công", zone));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ZoneDTO>> updateZone(@PathVariable Long id, @Valid @RequestBody ZoneDTO zoneDTO) {
        ZoneDTO updatedZone = zoneService.updateZone(id, zoneDTO); // Cần tạo phương thức này
        return ResponseEntity.ok(ApiResponse.success("Cập nhật vùng thành công", updatedZone));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteZone(@PathVariable Long id) {
        zoneService.deleteZone(id); // Cần tạo phương thức này
        return ResponseEntity.ok(ApiResponse.success("Xóa vùng thành công"));
    }
}