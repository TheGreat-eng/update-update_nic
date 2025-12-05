package com.example.iotserver.scheduler;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.example.iotserver.service.PlantHealthService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Scheduled tasks cho Plant Health Module
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PlantHealthScheduler {

    private final PlantHealthService plantHealthService;

    /**
     * Dọn dẹp cảnh báo cũ đã xử lý
     * Chạy mỗi ngày lúc 2:00 sáng
     * Giữ lại cảnh báo trong 30 ngày
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public void cleanupOldAlerts() {
        log.info(" [Scheduler] Bắt đầu dọn dẹp cảnh báo cũ...");

        try {
            int daysToKeep = 30;
            plantHealthService.cleanupOldAlerts(daysToKeep);

            log.info(" [Scheduler] Hoàn thành dọn dẹp cảnh báo cũ hơn {} ngày", daysToKeep);

        } catch (Exception e) {
            log.error(" [Scheduler] Lỗi khi dọn dẹp cảnh báo: {}", e.getMessage(), e);
        }
    }
}