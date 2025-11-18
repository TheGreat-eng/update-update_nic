// TẠO FILE MỚI: src/main/java/com/example/iotserver/scheduler/NotificationScheduler.java
package com.example.iotserver.scheduler;

import com.example.iotserver.entity.Farm;
import com.example.iotserver.entity.Notification;
import com.example.iotserver.repository.FarmRepository;
import com.example.iotserver.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
@Slf4j
@RequiredArgsConstructor
public class NotificationScheduler {

    private final StringRedisTemplate redisTemplate;
    private final NotificationService notificationService;
    private final FarmRepository farmRepository;

    /**
     * Chạy mỗi 2 phút để gom các thông báo offline và gửi 1 lần
     */
    @Scheduled(fixedRate = 120000) // 2 phút
    public void processOfflineNotifications() {
        Set<String> farmIds = redisTemplate.opsForSet().members("farms_with_offline_devices");

        if (farmIds == null || farmIds.isEmpty())
            return;

        for (String farmIdStr : farmIds) {
            Long farmId = Long.parseLong(farmIdStr);
            String deviceKey = "offline_pending:" + farmId;

            // Lấy tất cả thiết bị offline của farm này
            Set<String> devices = redisTemplate.opsForSet().members(deviceKey);

            if (devices != null && !devices.isEmpty()) {
                // Xây dựng nội dung thông báo gộp
                Farm farm = farmRepository.findById(farmId).orElse(null);
                if (farm != null && farm.getOwner() != null) {
                    String title = String.format("Cảnh báo: %d thiết bị mất kết nối", devices.size());

                    StringBuilder msgBuilder = new StringBuilder();
                    msgBuilder.append(String.format("Phát hiện %d thiết bị tại '%s' vừa mất kết nối:\n", devices.size(),
                            farm.getName()));

                    // Liệt kê tối đa 5 thiết bị, còn lại ghi "và ... thiết bị khác"
                    int count = 0;
                    for (String dev : devices) {
                        if (count < 5) {
                            msgBuilder.append("- ").append(dev).append("\n");
                        }
                        count++;
                    }
                    if (devices.size() > 5) {
                        msgBuilder.append("... và ").append(devices.size() - 5).append(" thiết bị khác.");
                    }

                    msgBuilder.append("Vui lòng kiểm tra nguồn điện và mạng internet.");

                    // Gửi thông báo gộp
                    notificationService.createAndSendNotification(
                            farm.getOwner(),
                            title,
                            msgBuilder.toString(),
                            Notification.NotificationType.DEVICE_STATUS,
                            "/devices",
                            true // Gửi email
                    );

                    log.info("Sent grouped offline notification for Farm {}", farmId);
                }

                // Xóa dữ liệu trong Redis sau khi gửi xong
                redisTemplate.delete(deviceKey);
            }
        }
        // Xóa danh sách farm pending
        redisTemplate.delete("farms_with_offline_devices");
    }
}