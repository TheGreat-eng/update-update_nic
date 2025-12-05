package com.example.iotserver.scheduler;

import java.time.LocalDateTime;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.example.iotserver.repository.RuleExecutionLogRepository;
import com.example.iotserver.service.RuleEngineService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
@RequiredArgsConstructor
public class RuleScheduler {

    private final RuleEngineService ruleEngineService;
        private final RuleExecutionLogRepository ruleExecutionLogRepository;


    /**
     * Chạy Rule Engine mỗi 30 giây
     * 
     * fixedDelay = 30000 nghĩa là sau khi hoàn thành, đợi 30 giây rồi chạy lại
     */
    @Scheduled(fixedDelay = 30000, initialDelay = 10000)
    public void executeRules() {
        log.debug(" Bắt đầu kiểm tra quy tắc tự động...");

        try {
            ruleEngineService.executeAllRules();
        } catch (Exception e) {
            log.error("Lỗi khi chạy Rule Engine: {}", e.getMessage(), e);
        }
    }

    /**
     * Dọn dẹp log cũ mỗi ngày lúc 2:00 sáng
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public void cleanupOldLogs() {
        log.info(" Bắt đầu dọn dẹp log cũ...");

        // [FIX 2: IMPLEMENT CLEANUP] - Xóa log cũ hơn 7 ngày (hoặc 30 ngày tùy bạn)
        LocalDateTime threshold = LocalDateTime.now().minusDays(7);
        try {
            // Cần đảm bảo phương thức deleteOldLogs đã có trong Repository (đã khai báo ở các bước trước)
            // Lưu ý: Cần thêm @Transactional cho phương thức xóa số lượng lớn
            ruleExecutionLogRepository.deleteOldLogs(threshold);
            log.info(" Đã xóa các log thực thi quy tắc cũ hơn {}", threshold);
        } catch (Exception e) {
            log.error(" Lỗi khi dọn dẹp log: {}", e.getMessage());
        }
    }
}