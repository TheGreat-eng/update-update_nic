// TẠO FILE MỚI: src/main/java/com/example/iotserver/controller/PlantProfileController.java
package com.example.iotserver.controller;

import com.example.iotserver.dto.PlantProfileSummaryDTO;
import com.example.iotserver.dto.response.ApiResponse;
import com.example.iotserver.service.PlantProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/plant-profiles")
@RequiredArgsConstructor
@Tag(name = "11. Plant Profiles", description = "API liên quan đến Hồ sơ cây trồng")
public class PlantProfileController {

    private final PlantProfileService profileService;

    @GetMapping
    @PreAuthorize("isAuthenticated()") // Yêu cầu người dùng phải đăng nhập
    @Operation(summary = "Lấy danh sách tóm tắt tất cả hồ sơ cây trồng")
    public ResponseEntity<ApiResponse<List<PlantProfileSummaryDTO>>> getAllProfileSummaries() {
        List<PlantProfileSummaryDTO> summaries = profileService.getAllProfileSummaries();
        return ResponseEntity.ok(ApiResponse.success(summaries));
    }
}