// THAY THẾ TOÀN BỘ FILE: src/main/java/com/example/iotserver/service/PlantHealthService.java

package com.example.iotserver.service;

import com.example.iotserver.dto.PlantHealthDTO;
import com.example.iotserver.dto.SensorDataDTO;
import com.example.iotserver.entity.*;
import com.example.iotserver.entity.PlantHealthAlert.AlertType;
import com.example.iotserver.entity.PlantHealthAlert.Severity;
import com.example.iotserver.repository.DeviceRepository;
import com.example.iotserver.repository.FarmRepository;
import com.example.iotserver.repository.PlantHealthAlertRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PlantHealthService {

    private final PlantHealthAlertRepository alertRepository;
    private final SensorDataService sensorDataService;
    private final ObjectMapper objectMapper;
    private final NotificationService notificationService;
    private final FarmRepository farmRepository;
    private final DeviceRepository deviceRepository;
    private final ConfigService configService;

    /**
     * Phân tích sức khỏe dựa trên dữ liệu mới nhất từ MỘT thiết bị cụ thể.
     * Hàm này được gọi từ MqttMessageHandler.
     */
    @Transactional
    public void analyzeHealthForDevice(Device device, SensorDataDTO latestData) {
        if (device.getFarm() == null) {
            log.warn("Device {} has no associated farm. Skipping health analysis.", device.getDeviceId());
            return;
        }

        Long farmId = device.getFarm().getId();
        log.info("🌿 Bắt đầu phân tích sức khỏe cho Farm {} từ dữ liệu của Device {}", farmId, device.getDeviceId());

        // Lấy danh sách cảnh báo đang hoạt động TRƯỚC KHI kiểm tra
        List<PlantHealthAlert> activeAlertsBeforeCheck = alertRepository
                .findByFarmIdAndResolvedFalseOrderByDetectedAtDesc(farmId);

        // Kiểm tra quy tắc dựa trên dữ liệu mới nhận được
        List<PlantHealthAlert> newAlerts = checkAllRules(device, latestData, activeAlertsBeforeCheck);

        if (!newAlerts.isEmpty()) {
            alertRepository.saveAll(newAlerts);
            log.info("✅ Đã tạo {} cảnh báo mới cho Farm {}", newAlerts.size(), farmId);
            sendNotificationsForNewHealthAlerts(device.getFarm(), newAlerts);
        }
    }

    /**
     * Phân tích sức khỏe tổng thể của nông trại (được gọi từ Controller).
     * Hàm này sẽ không kiểm tra quy tắc mới, chỉ tổng hợp trạng thái hiện tại.
     */
    @Transactional(readOnly = true)
    public PlantHealthDTO getHealthStatus(Long farmId) {
        log.info("🌿 Lấy báo cáo sức khỏe tổng hợp cho nông trại: {}", farmId);

        SensorDataDTO latestData = sensorDataService.getLatestSensorDataByFarmId(farmId);
        if (latestData == null) {
            log.warn("⚠️ Không có dữ liệu cảm biến cho nông trại: {}", farmId);
            return createEmptyHealthReport(farmId);
        }

        List<PlantHealthAlert> allActiveAlerts = alertRepository
                .findByFarmIdAndResolvedFalseOrderByDetectedAtDesc(farmId);
        Integer healthScore = calculateHealthScore(allActiveAlerts);

        return buildHealthReport(healthScore, allActiveAlerts, latestData);
    }

    private List<PlantHealthAlert> checkAllRules(Device device, SensorDataDTO data,
            List<PlantHealthAlert> existingAlerts) {
        List<PlantHealthAlert> alerts = new ArrayList<>();
        Farm farm = device.getFarm();
        Zone zone = device.getZone();

        Set<AlertType> existingAlertTypes = existingAlerts.stream()
                .map(PlantHealthAlert::getAlertType)
                .collect(Collectors.toSet());

        if (!existingAlertTypes.contains(AlertType.FUNGUS))
            checkFungusRisk(farm, zone, data).ifPresent(alerts::add);
        if (!existingAlertTypes.contains(AlertType.HEAT_STRESS))
            checkHeatStress(farm, zone, data).ifPresent(alerts::add);
        if (!existingAlertTypes.contains(AlertType.DROUGHT))
            checkDrought(farm, zone, data).ifPresent(alerts::add);
        if (!existingAlertTypes.contains(AlertType.COLD))
            checkColdRisk(farm, zone, data).ifPresent(alerts::add);
        if (!existingAlertTypes.contains(AlertType.UNSTABLE_MOISTURE))
            checkUnstableMoisture(farm, zone, data).ifPresent(alerts::add);
        if (!existingAlertTypes.contains(AlertType.LOW_LIGHT))
            checkLowLight(farm, zone, data).ifPresent(alerts::add);
        if (!existingAlertTypes.contains(AlertType.PH_ABNORMAL))
            checkPHAbnormal(farm, zone, data).ifPresent(alerts::add);

        return alerts;
    }

    private Optional<PlantHealthAlert> checkFungusRisk(Farm farm, Zone zone, SensorDataDTO data) {
        if (data.getHumidity() != null && data.getTemperature() != null) {
            double fungusHumidityThreshold = configService.getDouble(farm, zone,
                    "PLANT_HEALTH_FUNGUS_HUMIDITY_THRESHOLD", 85.0);
            double fungusTempMin = configService.getDouble(farm, zone, "PLANT_HEALTH_FUNGUS_TEMP_MIN", 20.0);
            double fungusTempMax = configService.getDouble(farm, zone, "PLANT_HEALTH_FUNGUS_TEMP_MAX", 28.0);

            log.info(
                    "[Health Check] Farm ID [{}]: Kiểm tra Nguy cơ Nấm. Độ ẩm: [{}%], Nhiệt độ: [{}°C], Ngưỡng Độ ẩm: [{}%]",
                    farm.getId(), data.getHumidity(), data.getTemperature(), fungusHumidityThreshold);

            boolean highHumidity = data.getHumidity() > fungusHumidityThreshold;
            boolean optimalTemp = data.getTemperature() >= fungusTempMin && data.getTemperature() <= fungusTempMax;

            if (highHumidity && optimalTemp) {
                log.warn("🍄 Phát hiện nguy cơ nấm! Độ ẩm: {}%, Nhiệt độ: {}°C", data.getHumidity(),
                        data.getTemperature());
                return Optional.of(PlantHealthAlert.builder()
                        .farmId(farm.getId()).alertType(AlertType.FUNGUS)
                        .severity(data.getHumidity() > 90 ? Severity.HIGH : Severity.MEDIUM)
                        .description(String.format(
                                "Nguy cơ nấm cao - Độ ẩm %.1f%% (vượt ngưỡng %.1f%%) và nhiệt độ %.1f°C thuận lợi cho nấm phát triển",
                                data.getHumidity(), fungusHumidityThreshold, data.getTemperature()))
                        .suggestion("Tăng thông gió, giảm tưới nước, xem xét xử lý phun thuốc phòng nấm")
                        .conditions(createConditionsJson(data)).build());
            }
        }
        return Optional.empty();
    }

    private Optional<PlantHealthAlert> checkHeatStress(Farm farm, Zone zone, SensorDataDTO data) {
        if (data.getTemperature() != null) {
            double heatStressThreshold = configService.getDouble(farm, zone, "PLANT_HEALTH_HEAT_STRESS_THRESHOLD",
                    38.0);
            log.info(
                    "[Health Check] Farm ID [{}]: Kiểm tra Stress Nhiệt. Nhiệt độ hiện tại: [{}°C], Ngưỡng động: [{}°C]",
                    farm.getId(), data.getTemperature(), heatStressThreshold);

            if (data.getTemperature() > heatStressThreshold) {
                log.warn("🔥 Phát hiện stress nhiệt! Nhiệt độ: {}°C", data.getTemperature());
                return Optional.of(PlantHealthAlert.builder()
                        .farmId(farm.getId()).alertType(AlertType.HEAT_STRESS)
                        .severity(data.getTemperature() > heatStressThreshold + 4 ? Severity.CRITICAL : Severity.HIGH)
                        .description(
                                String.format("Cây đang bị stress nhiệt - Nhiệt độ %.1f°C vượt ngưỡng an toàn (%.1f°C)",
                                        data.getTemperature(), heatStressThreshold))
                        .suggestion("Phun sương làm mát, che chắn nắng, tưới nước nhẹ vào buổi tối")
                        .conditions(createConditionsJson(data)).build());
            }
        }
        return Optional.empty();
    }

    private Optional<PlantHealthAlert> checkDrought(Farm farm, Zone zone, SensorDataDTO data) {
        if (data.getSoilMoisture() != null) {
            double droughtThreshold = configService.getDouble(farm, zone, "PLANT_HEALTH_DROUGHT_THRESHOLD", 30.0);
            log.info("[Health Check] Farm ID [{}]: Kiểm tra Thiếu Nước. Độ ẩm đất: [{}%], Ngưỡng động: [{}%]",
                    farm.getId(), data.getSoilMoisture(), droughtThreshold);

            if (data.getSoilMoisture() < droughtThreshold) {
                log.warn("💧 Phát hiện thiếu nước! Độ ẩm đất: {}%", data.getSoilMoisture());
                return Optional.of(PlantHealthAlert.builder()
                        .farmId(farm.getId()).alertType(AlertType.DROUGHT)
                        .severity(data.getSoilMoisture() < droughtThreshold - 10 ? Severity.CRITICAL : Severity.HIGH)
                        .description(String.format(
                                "Cây thiếu nước nghiêm trọng - Độ ẩm đất chỉ còn %.1f%% (dưới ngưỡng %.1f%%)",
                                data.getSoilMoisture(), droughtThreshold))
                        .suggestion("Tưới nước ngay lập tức, kiểm tra hệ thống tưới, xem xét tưới nhỏ giọt")
                        .conditions(createConditionsJson(data)).build());
            }
        }
        return Optional.empty();
    }

    private Optional<PlantHealthAlert> checkColdRisk(Farm farm, Zone zone, SensorDataDTO data) {
        if (data.getTemperature() != null) {
            double coldThreshold = configService.getDouble(farm, zone, "PLANT_HEALTH_COLD_THRESHOLD", 12.0);
            log.info("[Health Check] Farm ID [{}]: Kiểm tra Nguy cơ Lạnh. Nhiệt độ: [{}°C], Ngưỡng động: [{}°C]",
                    farm.getId(), data.getTemperature(), coldThreshold);

            if (data.getTemperature() < coldThreshold) {
                LocalTime now = LocalTime.now();
                if (now.isAfter(LocalTime.of(22, 0)) || now.isBefore(LocalTime.of(6, 0))) {
                    log.warn("❄️ Phát hiện nguy cơ lạnh! Nhiệt độ đêm: {}°C", data.getTemperature());
                    return Optional.of(PlantHealthAlert.builder()
                            .farmId(farm.getId()).alertType(AlertType.COLD)
                            .severity(data.getTemperature() < coldThreshold - 4 ? Severity.HIGH : Severity.MEDIUM)
                            .description(
                                    String.format("Nguy cơ cây bị lạnh - Nhiệt độ đêm %.1f°C thấp hơn ngưỡng (%.1f°C)",
                                            data.getTemperature(), coldThreshold))
                            .suggestion("Che phủ cho cây, dừng tưới vào đêm, xem xét bật đèn sưởi nếu có")
                            .conditions(createConditionsJson(data)).build());
                }
            }
        }
        return Optional.empty();
    }

    private Optional<PlantHealthAlert> checkUnstableMoisture(Farm farm, Zone zone, SensorDataDTO data) {
        if (data.getSoilMoisture() != null) {
            double moistureChangeThreshold = configService.getDouble(farm, zone,
                    "PLANT_HEALTH_MOISTURE_CHANGE_THRESHOLD", 30.0);
            SensorDataDTO oldData = sensorDataService.getSensorDataAt(farm.getId(), LocalDateTime.now().minusHours(6));

            if (oldData != null && oldData.getSoilMoisture() != null) {
                double change = Math.abs(data.getSoilMoisture() - oldData.getSoilMoisture());
                log.info("[Health Check] Farm ID [{}]: Kiểm tra Độ ẩm dao động. Thay đổi: [{}%], Ngưỡng: [{}%]",
                        farm.getId(), change, moistureChangeThreshold);

                if (change > moistureChangeThreshold) {
                    log.warn("⚡ Phát hiện độ ẩm dao động mạnh! Thay đổi: {}%", change);
                    return Optional.of(PlantHealthAlert.builder()
                            .farmId(farm.getId()).alertType(AlertType.UNSTABLE_MOISTURE).severity(Severity.MEDIUM)
                            .description(String.format(
                                    "Độ ẩm đất dao động mạnh - Thay đổi %.1f%% trong 6 giờ (từ %.1f%% -> %.1f%%), vượt ngưỡng %.1f%%",
                                    change, oldData.getSoilMoisture(), data.getSoilMoisture(), moistureChangeThreshold))
                            .suggestion("Điều chỉnh lịch tưới đều đặn hơn, kiểm tra hệ thống thoát nước")
                            .conditions(createConditionsJson(data)).build());
                }
            }
        }
        return Optional.empty();
    }

    private Optional<PlantHealthAlert> checkLowLight(Farm farm, Zone zone, SensorDataDTO data) {
        if (data.getLightIntensity() != null) {
            double lightThreshold = configService.getDouble(farm, zone, "PLANT_HEALTH_LIGHT_THRESHOLD", 1000.0);
            log.info("[Health Check] Farm ID [{}]: Kiểm tra Thiếu sáng. Cường độ: [{} lux], Ngưỡng: [{} lux]",
                    farm.getId(), data.getLightIntensity(), lightThreshold);

            if (data.getLightIntensity() < lightThreshold) {
                LocalTime now = LocalTime.now();
                if (now.isAfter(LocalTime.of(8, 0)) && now.isBefore(LocalTime.of(18, 0))) {
                    log.warn("🌥️ Phát hiện thiếu ánh sáng! Cường độ: {} lux", data.getLightIntensity());
                    return Optional.of(PlantHealthAlert.builder()
                            .farmId(farm.getId()).alertType(AlertType.LOW_LIGHT).severity(Severity.MEDIUM)
                            .description(String.format(
                                    "Cây thiếu ánh sáng - Cường độ chỉ %.0f lux (dưới ngưỡng %.0f lux) vào ban ngày",
                                    data.getLightIntensity(), lightThreshold))
                            .suggestion("Bật đèn bổ sung, cắt tỉa cây che bóng, di chuyển cây ra chỗ sáng hơn")
                            .conditions(createConditionsJson(data)).build());
                }
            }
        }
        return Optional.empty();
    }

    private Optional<PlantHealthAlert> checkPHAbnormal(Farm farm, Zone zone, SensorDataDTO data) {
        if (data.getSoilPH() != null) {
            double phMin = configService.getDouble(farm, zone, "PLANT_HEALTH_PH_MIN", 5.0);
            double phMax = configService.getDouble(farm, zone, "PLANT_HEALTH_PH_MAX", 7.5);
            log.info("[Health Check] Farm ID [{}]: Kiểm tra pH. Giá trị: [{}], Khoảng cho phép: [{} - {}]",
                    farm.getId(), data.getSoilPH(), phMin, phMax);

            if (data.getSoilPH() < phMin || data.getSoilPH() > phMax) {
                log.warn("⚗️ Phát hiện pH bất thường! pH: {}", data.getSoilPH());
                String description = data.getSoilPH() < phMin
                        ? String.format("Đất quá chua - pH %.1f thấp hơn mức an toàn (%.1f)", data.getSoilPH(), phMin)
                        : String.format("Đất quá kiềm - pH %.1f cao hơn mức an toàn (%.1f)", data.getSoilPH(), phMax);
                String suggestion = data.getSoilPH() < phMin
                        ? "Bón vôi để tăng pH, sử dụng phân hữu cơ, tránh phân hóa học"
                        : "Bón lưu huỳnh hoặc phân chua để giảm pH, tránh dùng vôi";
                return Optional.of(PlantHealthAlert.builder()
                        .farmId(farm.getId()).alertType(AlertType.PH_ABNORMAL).severity(Severity.MEDIUM)
                        .description(description).suggestion(suggestion).conditions(createConditionsJson(data))
                        .build());
            }
        }
        return Optional.empty();
    }

    // --- Các hàm helper còn lại (không cần sửa) ---

    private void sendNotificationsForNewHealthAlerts(Farm farm, List<PlantHealthAlert> newAlerts) {
        User owner = farm.getOwner();
        if (owner == null) {
            log.error("Không thể gửi thông báo sức khỏe cho farm {} vì không có chủ sở hữu.", farm.getId());
            return;
        }

        for (PlantHealthAlert alert : newAlerts) {
            if (alert.getSeverity() == Severity.LOW) {
                continue;
            }

            String title = String.format("[%s] %s", alert.getSeverity().getDisplayName(),
                    alert.getAlertType().getDisplayName());
            String message = alert.getDescription();
            String link = "/plant-health";

            notificationService.createAndSendNotification(owner, title, message,
                    Notification.NotificationType.PLANT_HEALTH_ALERT, link, true);
        }
    }

    private Integer calculateHealthScore(List<PlantHealthAlert> alerts) {
        if (alerts.isEmpty())
            return 100;
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

    private PlantHealthDTO buildHealthReport(Integer healthScore, List<PlantHealthAlert> alerts,
            SensorDataDTO latestData) {
        List<PlantHealthDTO.AlertDTO> alertDTOs = alerts.stream().map(this::convertToAlertDTO)
                .collect(Collectors.toList());
        PlantHealthDTO.SeverityStats stats = PlantHealthDTO.SeverityStats.builder()
                .critical(alerts.stream().filter(a -> a.getSeverity() == Severity.CRITICAL).count())
                .high(alerts.stream().filter(a -> a.getSeverity() == Severity.HIGH).count())
                .medium(alerts.stream().filter(a -> a.getSeverity() == Severity.MEDIUM).count())
                .low(alerts.stream().filter(a -> a.getSeverity() == Severity.LOW).count())
                .total(alerts.size()).build();
        String overallSuggestion = generateOverallSuggestion(alerts);
        Map<String, Object> conditions = new HashMap<>();
        if (latestData != null) {
            conditions.put("temperature", latestData.getTemperature());
            conditions.put("humidity", latestData.getHumidity());
            conditions.put("soilMoisture", latestData.getSoilMoisture());
            conditions.put("lightIntensity", latestData.getLightIntensity());
            conditions.put("soilPH", latestData.getSoilPH());
        }
        String status = PlantHealthDTO.HealthStatus.fromScore(healthScore).name();
        return PlantHealthDTO.builder()
                .healthScore(healthScore).status(status).activeAlerts(alertDTOs)
                .conditions(conditions).overallSuggestion(overallSuggestion)
                .analyzedAt(LocalDateTime.now()).severityStats(stats).build();
    }

    private String generateOverallSuggestion(List<PlantHealthAlert> alerts) {
        if (alerts.isEmpty())
            return "Sức khỏe cây tốt! Tiếp tục duy trì chế độ chăm sóc hiện tại.";
        long criticalCount = alerts.stream().filter(a -> a.getSeverity() == Severity.CRITICAL).count();
        long highCount = alerts.stream().filter(a -> a.getSeverity() == Severity.HIGH).count();
        if (criticalCount > 0)
            return String.format(
                    "⚠️ CẦN XỬ LÝ NGAY! Phát hiện %d vấn đề nghiêm trọng. Kiểm tra và xử lý các cảnh báo CRITICAL ngay lập tức.",
                    criticalCount);
        if (highCount > 0)
            return String.format(
                    "⚠️ Cần chú ý! Phát hiện %d vấn đề mức cao. Nên xử lý trong vòng 24 giờ để tránh ảnh hưởng đến cây.",
                    highCount);
        return String.format("Phát hiện %d vấn đề nhỏ. Theo dõi và điều chỉnh dần dần.", alerts.size());
    }

    private PlantHealthDTO.AlertDTO convertToAlertDTO(PlantHealthAlert alert) {
        Map<String, Object> conditions = new HashMap<>();
        if (alert.getConditions() != null) {
            alert.getConditions().fields().forEachRemaining(entry -> conditions.put(entry.getKey(), entry.getValue()));
        }
        return PlantHealthDTO.AlertDTO.builder()
                .id(alert.getId()).type(alert.getAlertType()).typeName(alert.getAlertType().getDisplayName())
                .severity(alert.getSeverity()).severityName(alert.getSeverity().getDisplayName())
                .description(alert.getDescription()).suggestion(alert.getSuggestion())
                .detectedAt(alert.getDetectedAt()).conditions(conditions).build();
    }

    private ObjectNode createConditionsJson(SensorDataDTO data) {
        ObjectNode conditions = objectMapper.createObjectNode();
        if (data.getTemperature() != null)
            conditions.put("temperature", data.getTemperature());
        if (data.getHumidity() != null)
            conditions.put("humidity", data.getHumidity());
        if (data.getSoilMoisture() != null)
            conditions.put("soilMoisture", data.getSoilMoisture());
        if (data.getLightIntensity() != null)
            conditions.put("lightIntensity", data.getLightIntensity());
        if (data.getSoilPH() != null)
            conditions.put("soilPH", data.getSoilPH());
        return conditions;
    }

    private PlantHealthDTO createEmptyHealthReport(Long farmId) {
        return PlantHealthDTO.builder()
                .healthScore(0).status(PlantHealthDTO.HealthStatus.CRITICAL.name())
                .activeAlerts(Collections.emptyList()).conditions(Collections.emptyMap())
                .overallSuggestion("Không có dữ liệu cảm biến. Kiểm tra kết nối thiết bị.")
                .analyzedAt(LocalDateTime.now())
                .severityStats(PlantHealthDTO.SeverityStats.builder().critical(0L).high(0L).medium(0L).low(0L).total(0L)
                        .build())
                .build();
    }

    public List<PlantHealthAlert> getAlertHistory(Long farmId, int days) {
        LocalDateTime startDate = LocalDateTime.now().minusDays(days);
        return alertRepository.findByFarmIdAndDetectedAtBetweenOrderByDetectedAtDesc(farmId, startDate,
                LocalDateTime.now());
    }

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
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(daysToKeep);
        alertRepository.deleteByResolvedTrueAndResolvedAtBefore(cutoffDate);
        log.info("🧹 Đã dọn dẹp các cảnh báo sức khỏe đã xử lý và cũ hơn ngày {}", cutoffDate);
    }
}