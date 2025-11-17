package com.example.iotserver.controller;

import com.example.iotserver.dto.SensorDataDTO;
import com.example.iotserver.dto.response.ApiResponse;
import com.example.iotserver.service.SensorDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final SensorDataService sensorDataService;

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<Map<String, List<SensorDataDTO>>>> getHistoricalData(
            @RequestParam List<String> deviceIds,
            @RequestParam List<String> fields,
            @RequestParam Instant start,
            @RequestParam Instant end,
            @RequestParam(defaultValue = "1h") String window) {

        Map<String, List<SensorDataDTO>> data = sensorDataService.getMultiSeriesData(deviceIds, fields, start, end,
                window);
        return ResponseEntity.ok(ApiResponse.success("Lấy dữ liệu lịch sử thành công", data));
    }
}