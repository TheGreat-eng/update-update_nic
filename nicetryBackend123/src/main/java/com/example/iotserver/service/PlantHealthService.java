package com.example.iotserver.service;

import com.example.iotserver.dto.PlantHealthDTO;
import com.example.iotserver.dto.SensorDataDTO;
import com.example.iotserver.entity.PlantHealthAlert;
import com.example.iotserver.entity.PlantHealthAlert.AlertType;
import com.example.iotserver.entity.PlantHealthAlert.Severity;
import com.example.iotserver.repository.PlantHealthAlertRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.iotserver.entity.Notification; // THÊM IMPORT NÀY
import com.example.iotserver.entity.User; // THÊM IMPORT NÀY
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

import com.example.iotserver.entity.Farm; // <<<< 1. THÊM IMPORT
import com.example.iotserver.repository.FarmRepository; // <<<< 1. THÊM IMPORT

/**
 * Service xử lý logic cảnh báo sức khỏe cây trồng
 * Bao gồm 7 quy tắc thông minh
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PlantHealthService {

    private final PlantHealthAlertRepository alertRepository;
    private final SensorDataService sensorDataService;
    private final ObjectMapper objectMapper;
    // private final EmailService emailService; // <<<< 2. INJECT EMAILSERVICE
    private final NotificationService notificationService; // <<<< THAY BẰNG DÒNG NÀY
    private final FarmRepository farmRepository; // <<<< 2. INJECT FARMREPOSITORY
    private final SettingService settingService; // <<<< THÊM VÀO

    /**
     * Phân tích sức khỏe tổng thể của nông trại
     */
    @Transactional
    public PlantHealthDTO analyzeHealth(Long farmId) {
        log.info("🌿 Bắt đầu phân tích sức khỏe cho nông trại: {}", farmId);

        SensorDataDTO latestData = sensorDataService.getLatestSensorDataByFarmId(farmId);

        if (latestData == null) {
            log.warn("⚠️ Không có dữ liệu cảm biến cho nông trại: {}", farmId);
            return createEmptyHealthReport(farmId);
        }

        // BƯỚC MỚI: Lấy danh sách cảnh báo đang hoạt động TRƯỚC KHI kiểm tra
        List<PlantHealthAlert> activeAlertsBeforeCheck = alertRepository
                .findByFarmIdAndResolvedFalseOrderByDetectedAtDesc(farmId);

        // Truyền danh sách này vào hàm checkAllRules
        List<PlantHealthAlert> newAlerts = checkAllRules(farmId, latestData, activeAlertsBeforeCheck);

        if (!newAlerts.isEmpty()) {
            alertRepository.saveAll(newAlerts);
            log.info("✅ Đã tạo {} cảnh báo mới", newAlerts.size());
        }

        // VVVV--- SỬA LẠI ĐOẠN GỌI HÀM GỬI THÔNG BÁO ---VVVV
        if (!newAlerts.isEmpty()) {
            alertRepository.saveAll(newAlerts);
            log.info("✅ Đã tạo {} cảnh báo mới", newAlerts.size());

            // Lấy entity Farm để có thông tin Owner
            Farm farm = farmRepository.findById(farmId)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy Farm để gửi thông báo sức khỏe."));

            // Gọi hàm gửi thông báo
            sendNotificationsForNewHealthAlerts(farm, newAlerts);
        }
        // ^^^^--------------------------------------------^^^^

        // Lấy lại danh sách đầy đủ sau khi đã thêm mới (nếu có)
        List<PlantHealthAlert> allActiveAlerts = alertRepository
                .findByFarmIdAndResolvedFalseOrderByDetectedAtDesc(farmId);

        Integer healthScore = calculateHealthScore(allActiveAlerts);
        return buildHealthReport(healthScore, allActiveAlerts, latestData);
    }

    // VVVV--- THAY THẾ TOÀN BỘ PHƯƠNG THỨC NÀY ---VVVV
    /**
     * Gửi thông báo cho từng cảnh báo sức khỏe mới được tạo.
     * 
     * @param farm      Nông trại nơi có cảnh báo.
     * @param newAlerts Danh sách các cảnh báo mới.
     */
    private void sendNotificationsForNewHealthAlerts(Farm farm, List<PlantHealthAlert> newAlerts) {
        User owner = farm.getOwner();
        if (owner == null) {
            log.error("Không thể gửi thông báo sức khỏe cho farm {} vì không có chủ sở hữu.", farm.getId());
            return;
        }

        for (PlantHealthAlert alert : newAlerts) {
            // Chỉ gửi thông báo cho các cảnh báo từ mức độ MEDIUM trở lên
            if (alert.getSeverity() == Severity.LOW) {
                continue;
            }

            String title = String.format("[%s] %s",
                    alert.getSeverity().getDisplayName(),
                    alert.getAlertType().getDisplayName());

            String message = alert.getDescription();
            String link = "/plant-health"; // Link đến trang Sức khỏe cây trồng

            notificationService.createAndSendNotification(
                    owner,
                    title,
                    message,
                    Notification.NotificationType.PLANT_HEALTH_ALERT,
                    link,
                    true // Gửi email
            );
        }
    }
    // ^^^^---------------------------------------^^^^

    /**
     * Kiểm tra tất cả 7 quy tắc
     */
    private List<PlantHealthAlert> checkAllRules(Long farmId, SensorDataDTO data,
            List<PlantHealthAlert> existingAlerts) {
        List<PlantHealthAlert> alerts = new ArrayList<>();

        // Lấy danh sách các loại cảnh báo đã tồn tại để kiểm tra nhanh
        Set<AlertType> existingAlertTypes = existingAlerts.stream()
                .map(PlantHealthAlert::getAlertType)
                .collect(Collectors.toSet());

        // Sửa đổi mỗi lần gọi hàm check: chỉ thêm nếu loại cảnh báo đó chưa tồn tại
        if (!existingAlertTypes.contains(AlertType.FUNGUS)) {
            checkFungusRisk(farmId, data).ifPresent(alerts::add);
        }
        if (!existingAlertTypes.contains(AlertType.HEAT_STRESS)) {
            checkHeatStress(farmId, data).ifPresent(alerts::add);
        }
        if (!existingAlertTypes.contains(AlertType.DROUGHT)) {
            checkDrought(farmId, data).ifPresent(alerts::add);
        }
        if (!existingAlertTypes.contains(AlertType.COLD)) {
            checkColdRisk(farmId, data).ifPresent(alerts::add);
        }
        if (!existingAlertTypes.contains(AlertType.UNSTABLE_MOISTURE)) {
            checkUnstableMoisture(farmId, data).ifPresent(alerts::add);
        }
        if (!existingAlertTypes.contains(AlertType.LOW_LIGHT)) {
            checkLowLight(farmId, data).ifPresent(alerts::add);
        }
        if (!existingAlertTypes.contains(AlertType.PH_ABNORMAL)) {
            checkPHAbnormal(farmId, data).ifPresent(alerts::add);
        }

        return alerts;
    }

    /**
     * QUY TẮC 1: Phát hiện nguy cơ nấm 🍄
     * Điều kiện: Độ ẩm > 85% AND nhiệt độ 20-28°C
     */
    private Optional<PlantHealthAlert> checkFungusRisk(Long farmId, SensorDataDTO data) {
        if (data.getHumidity() != null && data.getTemperature() != null) {
            double fungusHumidityThreshold = settingService.getDouble("PLANT_HEALTH_FUNGUS_HUMIDITY_THRESHOLD", 85.0);
            double fungusTempMin = settingService.getDouble("PLANT_HEALTH_FUNGUS_TEMP_MIN", 20.0);
            double fungusTempMax = settingService.getDouble("PLANT_HEALTH_FUNGUS_TEMP_MAX", 28.0);

            boolean highHumidity = data.getHumidity() > fungusHumidityThreshold;
            boolean optimalTemp = data.getTemperature() >= fungusTempMin && data.getTemperature() <= fungusTempMax;

            if (highHumidity && optimalTemp) {
                log.warn("🍄 Phát hiện nguy cơ nấm! Độ ẩm: {}%, Nhiệt độ: {}°C", data.getHumidity(),
                        data.getTemperature());
                return Optional.of(PlantHealthAlert.builder()
                        .farmId(farmId).alertType(AlertType.FUNGUS)
                        .severity(data.getHumidity() > 90 ? Severity.HIGH : Severity.MEDIUM)
                        .description(String.format(
                                "Nguy cơ nấm cao - Độ ẩm %.1f%%, nhiệt độ %.1f°C thuận lợi cho nấm phát triển",
                                data.getHumidity(), data.getTemperature()))
                        .suggestion("Tăng thông gió, giảm tưới nước, xem xét xử lý phun thuốc phòng nấm")
                        .conditions(createConditionsJson(data)).build());
            }
        }
        return Optional.empty();
    }

    /**
     * QUY TẮC 2: Phát hiện stress nhiệt 🔥
     * Điều kiện: Nhiệt độ > 38°C
     */
    private Optional<PlantHealthAlert> checkHeatStress(Long farmId, SensorDataDTO data) {
        if (data.getTemperature() != null) {
            double heatStressThreshold = settingService.getDouble("PLANT_HEALTH_HEAT_STRESS_THRESHOLD", 38.0);
            if (data.getTemperature() > heatStressThreshold) {
                log.warn("🔥 Phát hiện stress nhiệt! Nhiệt độ: {}°C", data.getTemperature());
                return Optional.of(PlantHealthAlert.builder()
                        .farmId(farmId).alertType(AlertType.HEAT_STRESS)
                        .severity(data.getTemperature() > 42 ? Severity.CRITICAL : Severity.HIGH)
                        .description(String.format("Cây đang bị stress nhiệt - Nhiệt độ %.1f°C vượt ngưỡng an toàn",
                                data.getTemperature()))
                        .suggestion("Phun sương làm mát, che chắn nắng, tưới nước nhẹ vào buổi tối")
                        .conditions(createConditionsJson(data)).build());
            }
        }
        return Optional.empty();
    }

    /**
     * QUY TẮC 3: Phát hiện thiếu nước 💧
     * Điều kiện: Độ ẩm đất < 30%
     */
    private Optional<PlantHealthAlert> checkDrought(Long farmId, SensorDataDTO data) {
        if (data.getSoilMoisture() != null) {
            double droughtThreshold = settingService.getDouble("PLANT_HEALTH_DROUGHT_THRESHOLD", 30.0);
            if (data.getSoilMoisture() < droughtThreshold) {
                log.warn("💧 Phát hiện thiếu nước! Độ ẩm đất: {}%", data.getSoilMoisture());
                return Optional.of(PlantHealthAlert.builder()
                        .farmId(farmId).alertType(AlertType.DROUGHT)
                        .severity(data.getSoilMoisture() < 20 ? Severity.CRITICAL : Severity.HIGH)
                        .description(String.format("Cây thiếu nước nghiêm trọng - Độ ẩm đất chỉ còn %.1f%%",
                                data.getSoilMoisture()))
                        .suggestion("Tưới nước ngay lập tức, kiểm tra hệ thống tưới, xem xét tưới nhỏ giọt")
                        .conditions(createConditionsJson(data)).build());
            }
        }
        return Optional.empty();
    }

    /**
     * QUY TẮC 4: Phát hiện nguy cơ lạnh ❄️
     * Điều kiện: Nhiệt độ < 12°C vào ban đêm (22h-6h)
     */
    private Optional<PlantHealthAlert> checkColdRisk(Long farmId, SensorDataDTO data) {
        if (data.getTemperature() != null) {
            double coldThreshold = settingService.getDouble("PLANT_HEALTH_COLD_THRESHOLD", 12.0);
            if (data.getTemperature() < coldThreshold) {
                LocalTime now = LocalTime.now();
                if (now.isAfter(LocalTime.of(22, 0)) || now.isBefore(LocalTime.of(6, 0))) {
                    log.warn("❄️ Phát hiện nguy cơ lạnh! Nhiệt độ đêm: {}°C", data.getTemperature());
                    return Optional.of(PlantHealthAlert.builder()
                            .farmId(farmId).alertType(AlertType.COLD)
                            .severity(data.getTemperature() < 8 ? Severity.HIGH : Severity.MEDIUM)
                            .description(String.format("Nguy cơ cây bị lạnh - Nhiệt độ đêm %.1f°C quá thấp",
                                    data.getTemperature()))
                            .suggestion("Che phủ cho cây, dừng tưới vào đêm, xem xét bật đèn sưởi nếu có")
                            .conditions(createConditionsJson(data)).build());
                }
            }
        }
        return Optional.empty();
    }

    /**
     * QUY TẮC 5: Phát hiện độ ẩm dao động mạnh ⚡
     * Điều kiện: Độ ẩm thay đổi > 30% trong 6 giờ
     */
    private Optional<PlantHealthAlert> checkUnstableMoisture(Long farmId, SensorDataDTO data) {
        if (data.getSoilMoisture() != null) {
            SensorDataDTO oldData = sensorDataService.getSensorDataAt(farmId, LocalDateTime.now().minusHours(6));
            if (oldData != null && oldData.getSoilMoisture() != null) {
                double change = Math.abs(data.getSoilMoisture() - oldData.getSoilMoisture());
                double moistureChangeThreshold = settingService.getDouble("PLANT_HEALTH_MOISTURE_CHANGE_THRESHOLD",
                        30.0);
                if (change > moistureChangeThreshold) {
                    log.warn("⚡ Phát hiện độ ẩm dao động mạnh! Thay đổi: {}%", change);
                    return Optional.of(PlantHealthAlert.builder()
                            .farmId(farmId).alertType(AlertType.UNSTABLE_MOISTURE).severity(Severity.MEDIUM)
                            .description(String.format(
                                    "Độ ẩm đất dao động mạnh - Thay đổi %.1f%% trong 6 giờ (từ %.1f%% lên %.1f%%)",
                                    change, oldData.getSoilMoisture(), data.getSoilMoisture()))
                            .suggestion("Điều chỉnh lịch tưới đều đặn hơn, kiểm tra hệ thống thoát nước")
                            .conditions(createConditionsJson(data)).build());
                }
            }
        }
        return Optional.empty();
    }

    /**
     * QUY TẮC 6: Phát hiện thiếu ánh sáng 🌥️
     * Điều kiện: Ánh sáng < 1000 lux ban ngày
     */
    private Optional<PlantHealthAlert> checkLowLight(Long farmId, SensorDataDTO data) {
        if (data.getLightIntensity() != null) {
            double lightThreshold = settingService.getDouble("PLANT_HEALTH_LIGHT_THRESHOLD", 1000.0);
            if (data.getLightIntensity() < lightThreshold) {
                LocalTime now = LocalTime.now();
                if (now.isAfter(LocalTime.of(8, 0)) && now.isBefore(LocalTime.of(18, 0))) {
                    log.warn("🌥️ Phát hiện thiếu ánh sáng! Cường độ: {} lux", data.getLightIntensity());
                    return Optional.of(PlantHealthAlert.builder()
                            .farmId(farmId).alertType(AlertType.LOW_LIGHT).severity(Severity.MEDIUM)
                            .description(String.format("Cây thiếu ánh sáng - Cường độ chỉ %.0f lux vào ban ngày",
                                    data.getLightIntensity()))
                            .suggestion("Bật đèn bổ sung, cắt tỉa cây che bóng, di chuyển cây ra chỗ sáng hơn")
                            .conditions(createConditionsJson(data)).build());
                }
            }
        }
        return Optional.empty();
    }

    /**
     * QUY TẮC 7: Phát hiện pH bất thường ⚗️
     * Điều kiện: pH < 5.0 hoặc pH > 7.5
     */
    private Optional<PlantHealthAlert> checkPHAbnormal(Long farmId, SensorDataDTO data) {
        if (data.getSoilPH() != null) {
            double phMin = settingService.getDouble("PLANT_HEALTH_PH_MIN", 5.0);
            double phMax = settingService.getDouble("PLANT_HEALTH_PH_MAX", 7.5);
            if (data.getSoilPH() < phMin || data.getSoilPH() > phMax) {
                log.warn("⚗️ Phát hiện pH bất thường! pH: {}", data.getSoilPH());
                String description = data.getSoilPH() < phMin
                        ? String.format("Đất quá chua - pH %.1f thấp hơn mức an toàn", data.getSoilPH())
                        : String.format("Đất quá kiềm - pH %.1f cao hơn mức an toàn", data.getSoilPH());
                String suggestion = data.getSoilPH() < phMin
                        ? "Bón vôi để tăng pH, sử dụng phân hữu cơ, tránh phân hóa học"
                        : "Bón lưu huỳnh hoặc phân chua để giảm pH, tránh dùng vôi";
                return Optional.of(PlantHealthAlert.builder()
                        .farmId(farmId).alertType(AlertType.PH_ABNORMAL).severity(Severity.MEDIUM)
                        .description(description).suggestion(suggestion).conditions(createConditionsJson(data))
                        .build());
            }
        }
        return Optional.empty();
    }

    /**
     * Tính điểm sức khỏe dựa trên số lượng và mức độ cảnh báo
     * Công thức: 100 - (CRITICAL×25) - (HIGH×15) - (MEDIUM×8) - (LOW×3)
     */
    private Integer calculateHealthScore(List<PlantHealthAlert> alerts) {
        if (alerts.isEmpty()) {
            return 100;
        }

        int score = 100;

        for (PlantHealthAlert alert : alerts) {
            switch (alert.getSeverity()) {
                case CRITICAL -> score -= 25;
                case HIGH -> score -= 15;
                case MEDIUM -> score -= 8;
                case LOW -> score -= 3;
            }
        }

        return Math.max(0, score);
    }

    /**
     * Tạo báo cáo sức khỏe đầy đủ
     */
    private PlantHealthDTO buildHealthReport(
            Integer healthScore,
            List<PlantHealthAlert> alerts,
            SensorDataDTO latestData) {
        // Chuyển đổi alerts sang DTO
        List<PlantHealthDTO.AlertDTO> alertDTOs = alerts.stream()
                .map(this::convertToAlertDTO)
                .collect(Collectors.toList());

        // Tính thống kê mức độ
        PlantHealthDTO.SeverityStats stats = PlantHealthDTO.SeverityStats.builder()
                .critical(alerts.stream().filter(a -> a.getSeverity() == Severity.CRITICAL).count())
                .high(alerts.stream().filter(a -> a.getSeverity() == Severity.HIGH).count())
                .medium(alerts.stream().filter(a -> a.getSeverity() == Severity.MEDIUM).count())
                .low(alerts.stream().filter(a -> a.getSeverity() == Severity.LOW).count())
                .total(alerts.size())
                .build();

        // Tạo gợi ý tổng quát
        String overallSuggestion = generateOverallSuggestion(alerts);

        // Điều kiện hiện tại
        Map<String, Object> conditions = new HashMap<>();
        if (latestData != null) {
            conditions.put("temperature", latestData.getTemperature());
            conditions.put("humidity", latestData.getHumidity());
            conditions.put("soilMoisture", latestData.getSoilMoisture());
            conditions.put("lightIntensity", latestData.getLightIntensity());
            conditions.put("soilPH", latestData.getSoilPH());
        }

        // Xác định trạng thái
        String status = PlantHealthDTO.HealthStatus.fromScore(healthScore).name();

        return PlantHealthDTO.builder()
                .healthScore(healthScore)
                .status(status)
                .activeAlerts(alertDTOs)
                .conditions(conditions)
                .overallSuggestion(overallSuggestion)
                .analyzedAt(LocalDateTime.now())
                .severityStats(stats)
                .build();
    }

    /**
     * Tạo gợi ý tổng quát dựa trên các cảnh báo
     */
    private String generateOverallSuggestion(List<PlantHealthAlert> alerts) {
        if (alerts.isEmpty()) {
            return "Sức khỏe cây tốt! Tiếp tục duy trì chế độ chăm sóc hiện tại.";
        }

        long criticalCount = alerts.stream()
                .filter(a -> a.getSeverity() == Severity.CRITICAL)
                .count();
        long highCount = alerts.stream()
                .filter(a -> a.getSeverity() == Severity.HIGH)
                .count();

        if (criticalCount > 0) {
            return String.format(
                    "⚠️ CẦN XỬ LÝ NGAY! Phát hiện %d vấn đề nghiêm trọng. Kiểm tra và xử lý các cảnh báo CRITICAL ngay lập tức.",
                    criticalCount);
        }

        if (highCount > 0) {
            return String.format(
                    "⚠️ Cần chú ý! Phát hiện %d vấn đề mức cao. Nên xử lý trong vòng 24 giờ để tránh ảnh hưởng đến cây.",
                    highCount);
        }

        return String.format(
                "Phát hiện %d vấn đề nhỏ. Theo dõi và điều chỉnh dần dần.",
                alerts.size());
    }

    /**
     * Chuyển đổi Alert entity sang DTO
     */
    private PlantHealthDTO.AlertDTO convertToAlertDTO(PlantHealthAlert alert) {
        Map<String, Object> conditions = new HashMap<>();
        if (alert.getConditions() != null) {
            alert.getConditions().fields().forEachRemaining(entry -> conditions.put(entry.getKey(), entry.getValue()));
        }

        return PlantHealthDTO.AlertDTO.builder()
                .id(alert.getId())
                .type(alert.getAlertType())
                .typeName(alert.getAlertType().getDisplayName())
                .severity(alert.getSeverity())
                .severityName(alert.getSeverity().getDisplayName())
                .description(alert.getDescription())
                .suggestion(alert.getSuggestion())
                .detectedAt(alert.getDetectedAt())
                .conditions(conditions)
                .build();
    }

    /**
     * Tạo JSON chứa điều kiện môi trường
     */
    private ObjectNode createConditionsJson(SensorDataDTO data) {
        ObjectNode conditions = objectMapper.createObjectNode();

        if (data.getTemperature() != null) {
            conditions.put("temperature", data.getTemperature());
        }
        if (data.getHumidity() != null) {
            conditions.put("humidity", data.getHumidity());
        }
        if (data.getSoilMoisture() != null) {
            conditions.put("soilMoisture", data.getSoilMoisture());
        }
        if (data.getLightIntensity() != null) {
            conditions.put("lightIntensity", data.getLightIntensity());
        }
        if (data.getSoilPH() != null) {
            conditions.put("soilPH", data.getSoilPH());
        }

        return conditions;
    }

    /**
     * Tạo báo cáo trống khi không có dữ liệu
     */
    private PlantHealthDTO createEmptyHealthReport(Long farmId) {
        return PlantHealthDTO.builder()
                .healthScore(0)
                .status(PlantHealthDTO.HealthStatus.CRITICAL.name())
                .activeAlerts(Collections.emptyList())
                .conditions(Collections.emptyMap())
                .overallSuggestion("Không có dữ liệu cảm biến. Kiểm tra kết nối thiết bị.")
                .analyzedAt(LocalDateTime.now())
                .severityStats(PlantHealthDTO.SeverityStats.builder()
                        .critical(0L).high(0L).medium(0L).low(0L).total(0L).build())
                .build();
    }

    /**
     * Lấy lịch sử cảnh báo trong N ngày
     */
    public List<PlantHealthAlert> getAlertHistory(Long farmId, int days) {
        LocalDateTime startDate = LocalDateTime.now().minusDays(days);
        LocalDateTime endDate = LocalDateTime.now();

        return alertRepository.findByFarmIdAndDetectedAtBetweenOrderByDetectedAtDesc(
                farmId, startDate, endDate);
    }

    /**
     * Đánh dấu cảnh báo đã xử lý
     */
    @Transactional
    public void resolveAlert(Long alertId, String resolutionNote) {
        PlantHealthAlert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy cảnh báo với ID: " + alertId));

        alert.setResolved(true);
        alert.setResolvedAt(LocalDateTime.now());
        alert.setResolutionNote(resolutionNote);

        alertRepository.save(alert);
        log.info("✅ Đã đánh dấu cảnh báo {} là đã xử lý", alertId);
    }

    @Transactional
    public void cleanupOldAlerts(int daysToKeep) {
        // Tính toán mốc thời gian cutoff
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(daysToKeep);

        // Gọi phương thức từ repository để thực hiện việc xóa
        alertRepository.deleteByResolvedTrueAndResolvedAtBefore(cutoffDate);

        log.info("🧹 Đã dọn dẹp các cảnh báo sức khỏe đã xử lý và cũ hơn ngày {}", cutoffDate);
    }

}