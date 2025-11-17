package com.example.iotserver.service;

import com.example.iotserver.dto.NotificationDTO;
import com.example.iotserver.entity.Notification;
import com.example.iotserver.entity.User;
import com.example.iotserver.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final WebSocketService webSocketService;
    private final EmailService emailService; // VVVV--- THÊM DEPENDENCY NÀY ---VVVV

    /**
     * Hàm trung tâm để tạo, lưu và đẩy thông báo.
     */
    @Transactional
    public void createAndSendNotification(User user, String title, String message, Notification.NotificationType type,
            String link, boolean shouldSendEmail) {
        Notification notification = Notification.builder()
                .user(user)
                .title(title)
                .message(message)
                .type(type)
                .link(link)
                .build();

        Notification savedNotification = notificationRepository.save(notification);
        log.info("Saved notification ID {} for user {}", savedNotification.getId(), user.getEmail());

        // Gửi qua WebSocket tới user cụ thể
        webSocketService.sendNotificationToUser(user.getId(), NotificationDTO.fromEntity(savedNotification));

        // VVVV--- THÊM LOGIC GỬI EMAIL ---VVVV
        if (shouldSendEmail && user.getEmail() != null) {
            String emailSubject = "[SmartFarm] " + title;
            String emailText = "Xin chào " + user.getFullName() + ",\n\n"
                    + "Bạn có một thông báo mới từ hệ thống SmartFarm:\n\n"
                    + "Tiêu đề: " + title + "\n"
                    + "Nội dung: " + message + "\n\n"
                    + "Vui lòng đăng nhập vào hệ thống để xem chi tiết.\n"
                    + "Đường dẫn: http://your-frontend-url.com" + (link != null ? link : "") + "\n\n"
                    + "Trân trọng,\nĐội ngũ SmartFarm.";

            emailService.sendSimpleMessage(user.getEmail(), emailSubject, emailText);
        }

    }

    // --- Các hàm để Controller gọi ---

    public Page<NotificationDTO> getNotificationsForUser(Long userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(NotificationDTO::fromEntity);
    }

    public long getUnreadCountForUser(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        // Đảm bảo user chỉ có thể đánh dấu thông báo của chính mình
        if (!notification.getUser().getId().equals(userId)) {
            throw new SecurityException("Cannot mark notification for another user.");
        }
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadByUserId(userId);
    }
}