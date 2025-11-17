package com.example.iotserver.controller;

import com.example.iotserver.dto.ScheduleDTO;
import com.example.iotserver.dto.response.ApiResponse;
import com.example.iotserver.service.ScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/schedules")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleService scheduleService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ScheduleDTO>>> getSchedulesByFarm(@RequestParam Long farmId) {
        return ResponseEntity.ok(ApiResponse.success(scheduleService.getSchedulesByFarm(farmId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ScheduleDTO>> createSchedule(@RequestParam Long farmId,
            @RequestBody ScheduleDTO dto) {
        return ResponseEntity
                .ok(ApiResponse.success("Tạo lịch trình thành công", scheduleService.createSchedule(farmId, dto)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ScheduleDTO>> updateSchedule(@PathVariable Long id,
            @RequestBody ScheduleDTO dto) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thành công", scheduleService.updateSchedule(id, dto)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteSchedule(@PathVariable Long id) {
        scheduleService.deleteSchedule(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa thành công"));
    }
}