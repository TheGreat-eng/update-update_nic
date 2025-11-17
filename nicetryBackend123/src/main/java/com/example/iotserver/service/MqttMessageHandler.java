// src/main/java/com/example/iotserver/service/MqttMessageHandler.java

package com.example.iotserver.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.iotserver.dto.SensorDataDTO;
import com.example.iotserver.entity.Device;
import com.example.iotserver.entity.Farm;
import com.example.iotserver.repository.DeviceRepository;
import com.example.iotserver.repository.FarmRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageHeaders;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.iotserver.enums.DeviceStatus;
import com.example.iotserver.entity.User;
import com.example.iotserver.entity.Notification; // <<<< Thêm vào

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class MqttMessageHandler {

    private final DeviceRepository deviceRepository;
    private final SensorDataService sensorDataService;
    private final WebSocketService webSocketService;
    private final ObjectMapper objectMapper;
    private final PlantHealthService plantHealthService;
    // private final EmailService emailService; // <<<< Thêm vào
    // private final FarmRepository farmRepository; // <<<< Thêm vào
    private final NotificationService notificationService; // <<<< THÊM DÒNG NÀY
    private final SettingService settingService; // Service để lấy ngưỡng cài đặt
    private final StringRedisTemplate redisTemplate; // Redis để quản lý cooldown

    private static final int SENSOR_NOTIFICATION_COOLDOWN_HOURS = 4;

    @ServiceActivator(inputChannel = "mqttInputChannel")
    public void handleMessage(Message<?> message) {
        try {
            MessageHeaders headers = message.getHeaders();
            String topic = (String) headers.get("mqtt_receivedTopic");
            String payload = message.getPayload().toString();

            log.info("Received MQTT message - Topic: {}, Payload: {}", topic, payload);

            if (topic.startsWith("sensor/")) {
                handleSensorData(topic, payload);
            } else if (topic.startsWith("device/")) {
                handleDeviceStatus(topic, payload);
            }

        } catch (Exception e) {
            log.error("Error handling MQTT message: {}", e.getMessage(), e);
        }
    }

    // <<< DÁN TOÀN BỘ PHƯƠNG THỨC ĐÃ SỬA NÀY VÀO FILE >>>
    @Transactional
    private void handleSensorData(String topic, String payload) {
        try {
            String deviceId = topic.split("/")[1];
            Device device = deviceRepository.findByDeviceIdWithFarmAndOwner(deviceId)
                    .orElse(null);

            if (device == null) {
                log.warn("Nhận được dữ liệu từ thiết bị lạ chưa được đăng ký: {}", deviceId);
                return;
            }

            // <<< KIỂM TRA QUAN TRỌNG: Thiết bị đã được "nhận" vào nông trại chưa? >>>
            if (device.getFarm() == null) {
                log.warn("Nhận được dữ liệu từ thiết bị '{}' chưa được gán vào nông trại. Bỏ qua xử lý.", deviceId);
                // Cập nhật lastSeen để admin biết thiết bị vẫn đang online và chờ được nhận
                device.setLastSeen(LocalDateTime.now());
                deviceRepository.save(device);
                return; // Dừng xử lý tại đây để tránh lỗi NullPointerException
            }
            // <<< KẾT THÚC KIỂM TRA >>>

            // Từ đây trở đi, chúng ta chắc chắn rằng device.getFarm() không phải là null
            Long farmId = device.getFarm().getId();

            Map<String, Object> data = objectMapper.readValue(payload, Map.class);
            SensorDataDTO sensorData = SensorDataDTO.fromMqttPayload(deviceId, data);

            sensorData.setFarmId(farmId);

            sensorDataService.saveSensorData(sensorData);

            device.setLastSeen(LocalDateTime.now());
            if (device.getStatus() != DeviceStatus.ONLINE) {
                device.setStatus(DeviceStatus.ONLINE);
                webSocketService.sendDeviceStatus(farmId, deviceId, "ONLINE");
            }
            deviceRepository.save(device);

            webSocketService.sendSensorData(farmId, sensorData);
            plantHealthService.analyzeHealth(farmId);

            checkForSensorAnomaliesAndNotify(device.getFarm(), device, sensorData);

            log.info("Xử lý thành công dữ liệu cảm biến từ thiết bị: {}", deviceId);

        } catch (Exception e) {
            log.error("Lỗi khi xử lý dữ liệu cảm biến: {}", e.getMessage(), e);
        }
    }

    @Transactional // Thêm @Transactional để đảm bảo lưu DB thành công
    private void handleDeviceStatus(String topic, String payload) {
        try {
            String deviceId = topic.split("/")[1];
            Map<String, Object> statusMap = objectMapper.readValue(payload, Map.class);

            deviceRepository.findByDeviceId(deviceId).ifPresent(device -> {
                // Lấy dữ liệu từ payload
                String statusStr = (String) statusMap.get("status");
                String stateStr = (String) statusMap.get("state"); // <-- Lấy state

                // Cập nhật trạng thái kết nối (ONLINE/OFFLINE)
                if (statusStr != null) {
                    device.setStatus(DeviceStatus.valueOf(statusStr.toUpperCase()));
                }

                // Cập nhật trạng thái hoạt động (ON/OFF)
                if (stateStr != null) {
                    device.setCurrentState(stateStr.toUpperCase()); // <-- Lưu state
                }

                device.setLastSeen(LocalDateTime.now());
                Device updatedDevice = deviceRepository.save(device); // Lưu lại

                log.info("Updated device status: {} - Status: {}, State: {}",
                        deviceId, updatedDevice.getStatus(), updatedDevice.getCurrentState());

                // VVVV--- GỬI THÔNG BÁO WEBSOCKET (BƯỚC BỊ THIẾU) ---VVVV
                // webSocketService.sendDeviceStatus(
                // updatedDevice.getFarm().getId(),
                // updatedDevice.getDeviceId(),
                // updatedDevice.getStatus().name()
                // // có thể mở rộng WebSocketService để gửi cả currentState nếu cần
                // );

                // VVVV--- SỬA LẠI HOÀN TOÀN LOGIC GỬI WEBSOCKET ---VVVV
                Map<String, Object> wsPayload = new HashMap<>();
                wsPayload.put("deviceId", updatedDevice.getDeviceId());
                wsPayload.put("status", updatedDevice.getStatus().name());
                wsPayload.put("currentState", updatedDevice.getCurrentState());
                wsPayload.put("lastSeen", updatedDevice.getLastSeen().toString());
                wsPayload.put("timestamp", System.currentTimeMillis());

                webSocketService.sendDeviceStatus(updatedDevice.getFarm().getId(), wsPayload);
                // ^^^^-------------------------------------------------^^^^
                // ^^^^-------------------------------------------------^^^^
            });
        } catch (Exception e) {
            log.error("Error processing device status: {}", e.getMessage(), e);
        }
    }

    // VVVV--- ĐÂY LÀ PHẦN LOGIC MỚI ĐƯỢC THÊM VÀO ---VVVV
    /**
     * Kiểm tra các ngưỡng tức thời từ dữ liệu cảm biến và tạo thông báo nếu cần.
     */
    private void checkForSensorAnomaliesAndNotify(Farm farm, Device device, SensorDataDTO data) {
        User owner = farm.getOwner();
        if (owner == null)
            return;

        // 1. Kiểm tra nhiệt độ cao
        double highTempThreshold = settingService.getDouble("SENSOR_HIGH_TEMP_THRESHOLD", 38.0);
        if (data.getTemperature() != null && data.getTemperature() > highTempThreshold) {
            String alertType = "SENSOR_HIGH_TEMP";
            if (canSendNotification(farm.getId(), alertType, device.getDeviceId())) {
                String title = String.format("Cảnh Báo: Nhiệt độ cao tại %s", device.getName());
                String message = String.format(
                        "Nhiệt độ đo được là %.1f°C, vượt ngưỡng %.1f°C. Hãy kiểm tra hệ thống làm mát.",
                        data.getTemperature(), highTempThreshold);
                notificationService.createAndSendNotification(owner, title, message,
                        Notification.NotificationType.DEVICE_STATUS, "/devices",
                        true);
                setNotificationCooldown(farm.getId(), alertType, device.getDeviceId());
            }
        }

        // 2. Kiểm tra độ ẩm đất thấp
        double lowSoilThreshold = settingService.getDouble("SENSOR_LOW_SOIL_MOISTURE_THRESHOLD", 20.0);
        if (data.getSoilMoisture() != null && data.getSoilMoisture() < lowSoilThreshold) {
            String alertType = "SENSOR_LOW_SOIL";
            if (canSendNotification(farm.getId(), alertType, device.getDeviceId())) {
                String title = String.format("Cảnh Báo: Độ ẩm đất thấp tại %s", device.getName());
                String message = String.format("Độ ẩm đất chỉ còn %.1f%%, dưới ngưỡng %.1f%%. Cần tưới nước ngay.",
                        data.getSoilMoisture(), lowSoilThreshold);
                notificationService.createAndSendNotification(owner, title, message,
                        Notification.NotificationType.DEVICE_STATUS, "/devices",
                        true);
                setNotificationCooldown(farm.getId(), alertType, device.getDeviceId());
            }
        }

        // 3. Kiểm tra độ ẩm không khí cao
        double highHumidityThreshold = settingService.getDouble("SENSOR_HIGH_HUMIDITY_THRESHOLD", 90.0);
        if (data.getHumidity() != null && data.getHumidity() > highHumidityThreshold) {
            String alertType = "SENSOR_HIGH_HUMIDITY";
            if (canSendNotification(farm.getId(), alertType, device.getDeviceId())) {
                String title = String.format("Cảnh Báo: Độ ẩm cao tại %s", device.getName());
                String message = String.format("Độ ẩm không khí là %.1f%%, vượt ngưỡng %.1f%%, có nguy cơ nấm bệnh.",
                        data.getHumidity(), highHumidityThreshold);
                notificationService.createAndSendNotification(owner, title, message,
                        Notification.NotificationType.DEVICE_STATUS, "/devices",
                        true);
                setNotificationCooldown(farm.getId(), alertType, device.getDeviceId());
            }
        }
    }

    private boolean canSendNotification(Long farmId, String alertType, String deviceId) {
        String redisKey = "cooldown:notification:" + farmId + ":" + alertType + ":" + deviceId;
        return !Boolean.TRUE.equals(redisTemplate.hasKey(redisKey));
    }

    private void setNotificationCooldown(Long farmId, String alertType, String deviceId) {
        String redisKey = "cooldown:notification:" + farmId + ":" + alertType + ":" + deviceId;
        redisTemplate.opsForValue().set(redisKey, "sent", Duration.ofHours(SENSOR_NOTIFICATION_COOLDOWN_HOURS));
    }
    // ^^^^---------------------------------------------------^^^^

}