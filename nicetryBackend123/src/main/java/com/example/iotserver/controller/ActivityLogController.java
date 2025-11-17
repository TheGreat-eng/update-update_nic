package com.example.iotserver.controller;

import com.example.iotserver.dto.ActivityLogDTO;
import com.example.iotserver.dto.response.ApiResponse;
import com.example.iotserver.dto.response.PageResponse;
import com.example.iotserver.entity.ActivityLog;
import com.example.iotserver.repository.ActivityLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/logs")
@RequiredArgsConstructor
public class ActivityLogController {

    private final ActivityLogRepository activityLogRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ActivityLogDTO>>> getLogs(
            @RequestParam Long farmId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size);
        Page<ActivityLog> logPage = activityLogRepository.findByFarmIdOrderByCreatedAtDesc(farmId, pageable);

        Page<ActivityLogDTO> dtoPage = logPage.map(this::mapToDTO);

        return ResponseEntity.ok(ApiResponse.success(dtoPage));
    }

    private ActivityLogDTO mapToDTO(ActivityLog log) {
        return ActivityLogDTO.builder()
                .id(log.getId())
                .actorName(log.getActorName())
                .actionType(log.getActionType())
                .description(log.getDescription())
                .status(log.getStatus().name())
                .createdAt(log.getCreatedAt())
                .build();
    }
}