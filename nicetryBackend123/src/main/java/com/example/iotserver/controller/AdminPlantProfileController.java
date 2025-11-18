// SỬA FILE: src/main/java/com/example/iotserver/controller/AdminPlantProfileController.java
package com.example.iotserver.controller;

import com.example.iotserver.dto.PlantProfileDTO;
import com.example.iotserver.dto.response.ApiResponse;
import com.example.iotserver.service.PlantProfileService;
import io.swagger.v3.oas.annotations.Operation; // Thêm import
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List; // Thêm import

@RestController
@RequestMapping("/api/admin/plant-profiles")
@RequiredArgsConstructor
@Tag(name = "01. Admin Management")
@PreAuthorize("hasAuthority('ADMIN')")
public class AdminPlantProfileController {

    private final PlantProfileService profileService;

    // VVVV--- BỔ SUNG ENDPOINT NÀY ---VVVV
    @GetMapping("/all")
    @Operation(summary = "Lấy tất cả hồ sơ cây trồng (Admin)", description = "Lấy danh sách đầy đủ thông tin các hồ sơ, bao gồm cả settings.")
    public ResponseEntity<ApiResponse<List<PlantProfileDTO>>> getAllProfiles() {
        List<PlantProfileDTO> profiles = profileService.getAllFullProfiles(); // Cần tạo hàm này trong service
        return ResponseEntity.ok(ApiResponse.success(profiles));
    }
    // ^^^^-----------------------------^^^^

    @PostMapping
    @Operation(summary = "Tạo hồ sơ cây trồng mới (Admin)")
    public ResponseEntity<ApiResponse<PlantProfileDTO>> createProfile(@Valid @RequestBody PlantProfileDTO dto) {
        PlantProfileDTO createdProfile = profileService.createProfile(dto);
        return new ResponseEntity<>(ApiResponse.success("Tạo hồ sơ thành công", createdProfile), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật hồ sơ cây trồng (Admin)")
    public ResponseEntity<ApiResponse<PlantProfileDTO>> updateProfile(@PathVariable Long id,
            @Valid @RequestBody PlantProfileDTO dto) {
        PlantProfileDTO updatedProfile = profileService.updateProfile(id, dto);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật hồ sơ thành công", updatedProfile));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết hồ sơ cây trồng (Admin)")
    public ResponseEntity<ApiResponse<PlantProfileDTO>> getProfile(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(profileService.getProfileById(id)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa hồ sơ cây trồng (Admin)")
    public ResponseEntity<ApiResponse<String>> deleteProfile(@PathVariable Long id) {
        profileService.deleteProfile(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa hồ sơ thành công"));
    }
}