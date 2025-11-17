package com.example.iotserver.service;

import com.example.iotserver.entity.ActivityLog;
import com.example.iotserver.entity.User;
import com.example.iotserver.repository.ActivityLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;
    private final AuthenticationService authenticationService;

    // Ghi log cho hành động của người dùng
    @Async // Chạy bất đồng bộ để không làm chậm request chính
    public void logUserActivity(Long farmId, String actionType, String targetType, String targetId,
            String description) {
        try {
            User currentUser = authenticationService.getCurrentAuthenticatedUser();
            ActivityLog log = ActivityLog.builder()
                    .farmId(farmId)
                    .userId(currentUser.getId())
                    .actorName(currentUser.getFullName())
                    .actionType(actionType)
                    .targetType(targetType)
                    .targetId(targetId)
                    .description(description)
                    .status(ActivityLog.LogStatus.SUCCESS)
                    .build();
            activityLogRepository.save(log);
        } catch (Exception e) {
            // Lỗi khi lấy user (ví dụ, gọi từ thread không xác thực)
            logSystemActivity(farmId, actionType, targetType, targetId, description, ActivityLog.LogStatus.FAILED,
                    e.getMessage());
        }
    }

    // Ghi log cho hành động của hệ thống (Scheduler, Rule Engine)
    @Async
    public void logSystemActivity(Long farmId, String actionType, String targetType, String targetId,
            String description, ActivityLog.LogStatus status, String details) {
        ActivityLog log = ActivityLog.builder()
                .farmId(farmId)
                .userId(null) // Không có user
                .actorName("Hệ thống")
                .actionType(actionType)
                .targetType(targetType)
                .targetId(targetId)
                .description(description)
                .status(status)
                .details(details)
                .build();
        activityLogRepository.save(log);
    }
}