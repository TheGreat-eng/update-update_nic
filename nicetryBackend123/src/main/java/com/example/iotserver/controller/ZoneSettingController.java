package com.example.iotserver.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.iotserver.dto.SettingDTO;
import com.example.iotserver.dto.response.ApiResponse;
import com.example.iotserver.service.ZoneSettingService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/zones/{zoneId}/settings")
@RequiredArgsConstructor
public class ZoneSettingController {

    private final ZoneSettingService zoneSettingService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SettingDTO>>> getSettings(@PathVariable Long zoneId) {
        return ResponseEntity.ok(ApiResponse.success(zoneSettingService.getZoneConfigurableSettings(zoneId)));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<String>> updateSettings(@PathVariable Long zoneId,
            @RequestBody Map<String, String> settings) {
        zoneSettingService.updateZoneSettings(zoneId, settings);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật cài đặt vùng thành công"));
    }
}