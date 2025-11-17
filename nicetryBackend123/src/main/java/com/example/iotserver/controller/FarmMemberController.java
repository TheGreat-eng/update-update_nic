package com.example.iotserver.controller;

import com.example.iotserver.dto.response.ApiResponse;
import com.example.iotserver.enums.FarmRole;
import com.example.iotserver.service.FarmMemberService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.iotserver.dto.FarmMemberDTO; // <<<< THÊM IMPORT NÀY
import java.util.List; // <<<< Thêm import
import io.swagger.v3.oas.annotations.Operation; // <<<< Thêm import

import java.util.Map;

@RestController
@RequestMapping("/api/farms/{farmId}/members")
@RequiredArgsConstructor
@Tag(name = "03. Farm Management", description = "API quản lý nông trại")
public class FarmMemberController {

    private final FarmMemberService farmMemberService;

    @PostMapping
    public ResponseEntity<ApiResponse<Object>> addMember(
            @PathVariable Long farmId,
            @RequestBody Map<String, String> request) {

        String email = request.get("email");
        FarmRole role = FarmRole.valueOf(request.getOrDefault("role", "VIEWER").toUpperCase());

        farmMemberService.addMember(farmId, email, role);

        return ResponseEntity.ok(ApiResponse.success("Thêm thành viên thành công", null));
    }

    // ... Viết thêm API GET để lấy danh sách và DELETE để xóa thành viên sau ...
    // add
    // <<<< BỔ SUNG CÁC API MỚI DƯỚI ĐÂY >>>>
    // delete
    // update
    @GetMapping
    @Operation(summary = "Lấy danh sách thành viên của nông trại")
    public ResponseEntity<ApiResponse<List<FarmMemberDTO>>> getMembers(@PathVariable Long farmId) {
        List<FarmMemberDTO> members = farmMemberService.getMembers(farmId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách thành viên thành công", members));
    }

    @PutMapping("/{userId}")
    @Operation(summary = "Cập nhật vai trò của thành viên")
    public ResponseEntity<ApiResponse<Object>> updateMemberRole(
            @PathVariable Long farmId,
            @PathVariable Long userId,
            @RequestBody Map<String, String> request) {

        FarmRole newRole = FarmRole.valueOf(request.get("role").toUpperCase());
        farmMemberService.updateMemberRole(farmId, userId, newRole);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật vai trò thành công", null));
    }

    @DeleteMapping("/{userId}")
    @Operation(summary = "Xóa thành viên khỏi nông trại")
    public ResponseEntity<ApiResponse<Object>> removeMember(
            @PathVariable Long farmId,
            @PathVariable Long userId) {

        farmMemberService.removeMember(farmId, userId);
        return ResponseEntity.ok(ApiResponse.success("Xóa thành viên thành công", null));
    }
}