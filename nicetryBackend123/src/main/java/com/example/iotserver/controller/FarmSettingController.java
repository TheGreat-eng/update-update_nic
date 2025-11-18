package com.example.iotserver.controller;

import com.example.iotserver.dto.SettingDTO;
import com.example.iotserver.dto.response.ApiResponse;
import com.example.iotserver.service.FarmSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/farms/{farmId}/settings")
@RequiredArgsConstructor
public class FarmSettingController {

    private final FarmSettingService farmSettingService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SettingDTO>>> getSettings(@PathVariable Long farmId) {
        // Hàm này giờ trả về DTO đã được xử lý
        return ResponseEntity.ok(ApiResponse.success(farmSettingService.getFarmConfigurableSettings(farmId)));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<String>> updateSettings(@PathVariable Long farmId,
            @RequestBody Map<String, String> settings) {
        farmSettingService.updateFarmSettings(farmId, settings);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thành công"));
    }
}