package com.example.iotserver.controller;

import com.example.iotserver.dto.response.ApiResponse;
import com.example.iotserver.entity.SystemSetting;
import com.example.iotserver.repository.SystemSettingRepository;
import com.example.iotserver.service.SettingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/settings")
@RequiredArgsConstructor
@Tag(name = "01. Admin Management")
@PreAuthorize("hasAuthority('ADMIN')") // Chỉ Admin mới có quyền truy cập
public class SettingController {

    private final SettingService settingService;
    private final SystemSettingRepository settingRepository;

    @GetMapping
    @Operation(summary = "Lấy tất cả cài đặt hệ thống")
    public ResponseEntity<ApiResponse<List<SystemSetting>>> getAllSettings() {
        List<SystemSetting> settings = settingRepository.findAll();
        return ResponseEntity.ok(ApiResponse.success(settings));
    }

    @GetMapping("/{key}")
    @Operation(summary = "Lấy một cài đặt theo key")
    public ResponseEntity<ApiResponse<String>> getSetting(@PathVariable String key) {
        String value = settingService.getString(key, null);
        if (value == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("Không tìm thấy cài đặt."));
        }
        return ResponseEntity.ok(ApiResponse.success(value));
    }

    @PutMapping
    @Operation(summary = "Cập nhật một hoặc nhiều cài đặt")
    public ResponseEntity<ApiResponse<String>> updateSettings(@RequestBody Map<String, String> settings) {
        settings.forEach(settingService::updateSetting);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật cài đặt thành công", null));
    }
}