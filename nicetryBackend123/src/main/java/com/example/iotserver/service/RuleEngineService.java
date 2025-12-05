package com.example.iotserver.service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.iotserver.dto.SensorDataDTO;
import com.example.iotserver.dto.WeatherDTO;
import com.example.iotserver.entity.ActivityLog;
import com.example.iotserver.entity.Device; // THÊM IMPORT
import com.example.iotserver.entity.Notification; // THÊM IMPORT
import com.example.iotserver.entity.Rule;
import com.example.iotserver.entity.RuleCondition;
import com.example.iotserver.entity.RuleExecutionLog;
import com.example.iotserver.entity.User;
import com.example.iotserver.repository.DeviceRepository; // <<<< 1. THÊM IMPORT
import com.example.iotserver.repository.RuleExecutionLogRepository;
import com.example.iotserver.repository.RuleRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class RuleEngineService {

    private final RuleRepository ruleRepository;
    private final RuleExecutionLogRepository logRepository;
    private final SensorDataService sensorDataService;
    private final DeviceService deviceService;
    private final WebSocketService webSocketService;
    private final ObjectMapper objectMapper;
    private final WeatherService weatherService;
    // private final EmailService emailService;
    private final NotificationService notificationService; // <<<< THÊM DÒNG NÀY
    private final DeviceRepository deviceRepository; // VVVV--- THÊM DEPENDENCY NÀY ---VVVV
    private final ActivityLogService activityLogService; // <<< THÊM


    // ... dependencies cũ ...
    private final StringRedisTemplate redisTemplate; // [FIX]: Inject thêm cái này
    private static final String MANUAL_OVERRIDE_PREFIX = "manual_override:";

    /**
     * Chạy tất cả quy tắc đang kích hoạt
     */
    @Transactional
    public void executeAllRules() {
        long startTime = System.currentTimeMillis();
        List<Rule> enabledRules = ruleRepository.findAllEnabledRules();
        log.debug("Đang kiểm tra {} quy tắc đang kích hoạt", enabledRules.size());

        // <<<< 1. TẠO CACHE TẠM THỜI >>>>
        // Lấy tất cả deviceId cần thiết từ tất cả các quy tắc trong 1 lần
        Set<String> allDeviceIds = enabledRules.stream()
                .flatMap(rule -> rule.getConditions().stream())
                .filter(cond -> cond.getType() == RuleCondition.ConditionType.SENSOR_VALUE
                        && cond.getDeviceId() != null)
                .map(RuleCondition::getDeviceId)
                .collect(Collectors.toSet());

        // Lấy dữ liệu cho tất cả thiết bị cần thiết trong 1 lần lặp
       // Dùng Batch Query để lấy dữ liệu 1 lần duy nhất
        Map<String, SensorDataDTO> sensorDataCache;
        if (!allDeviceIds.isEmpty()) {
            sensorDataCache = sensorDataService.getLatestDataForListDevices(allDeviceIds);
        } else {
            sensorDataCache = new HashMap<>();
        }
        log.debug("Đã cache dữ liệu cho {} thiết bị.", sensorDataCache.size());
        // <<<< KẾT THÚC PHẦN TẠO CACHE >>>>

        // [FIX 4: DANH SÁCH THIẾT BỊ ĐÃ ĐƯỢC ĐIỀU KHIỂN TRONG CHU KỲ NÀY]
        // Set này chứa các deviceId đã nhận lệnh từ quy tắc có priority cao hơn
        Set<String> devicesControlledInThisCycle = new java.util.HashSet<>();

        int successCount = 0;
        int skippedCount = 0;
        int failedCount = 0;

        for (Rule rule : enabledRules) {
            try {
                // Truyền thêm danh sách devicesControlledInThisCycle vào hàm executeRule
                boolean executed = executeRule(rule, sensorDataCache, devicesControlledInThisCycle);
                if (executed) {
                    successCount++;
                } else {
                    skippedCount++;
                }
            } catch (Exception e) {
                failedCount++;
                log.error("Lỗi khi thực thi quy tắc {}: {}", rule.getName(), e.getMessage());
            }
        }

        long executionTime = System.currentTimeMillis() - startTime;
        log.info("Hoàn thành kiểm tra quy tắc: {} thành công, {} bỏ qua, {} lỗi ({}ms)",
                successCount, skippedCount, failedCount, executionTime);
    }

    /**
     * Thực thi một quy tắc cụ thể
     */
    @Transactional
    public boolean executeRule(Rule rule, Map<String, SensorDataDTO> sensorDataCache, Set<String> devicesControlledInThisCycle) {
        long startTime = System.currentTimeMillis();


        // --- [FIX 1: THÊM LOGIC COOLDOWN] ---
    // Kiểm tra nếu quy tắc vừa chạy gần đây (ví dụ: trong vòng 5 phút) thì bỏ qua
    if (rule.getLastExecutedAt() != null) {
        long minutesSinceLastRun = java.time.temporal.ChronoUnit.MINUTES.between(
            rule.getLastExecutedAt(), 
            LocalDateTime.now()
        );
        
        // Cấu hình thời gian nghỉ (Cooldown) là 5 phút
        // Bạn có thể đưa số 5 này vào cấu hình Rule (entity) nếu muốn linh động
        if (minutesSinceLastRun < 5) {
            log.debug("⏳ Quy tắc '{}' đang trong thời gian nghỉ (Cooldown). Lần chạy cuối: {} phút trước.", 
                      rule.getName(), minutesSinceLastRun);
            return false; // Bỏ qua, không làm gì cả
        }
    }
    // --- [KẾT THÚC FIX 1] ---

        log.debug("Đang kiểm tra quy tắc: {}", rule.getName());

        try {
            // Bước 1: Kiểm tra điều kiện
            Map<String, Object> conditionContext = new HashMap<>();
            boolean allConditionsMet = evaluateConditions(rule, conditionContext, sensorDataCache);

            long executionTime = System.currentTimeMillis() - startTime;

            // Bước 2: Nếu điều kiện đúng → Thực hiện hành động
            if (allConditionsMet) {
                
                log.info(" Quy tắc '{}' - Điều kiện ĐÃ THỎA MÃN", rule.getName());

                // [FIX 4 & 3]: Truyền danh sách device đã lock xuống để kiểm tra trước khi action
                List<String> performedActions = performActions(rule, devicesControlledInThisCycle);
                
                // Nếu không có hành động nào thực sự được thực hiện (do bị chặn bởi Priority hoặc Manual Override)
                if (performedActions.isEmpty()) {
                     return false; 
                }

                // Cập nhật thống kê
                rule.setLastExecutedAt(LocalDateTime.now());
                rule.setExecutionCount(rule.getExecutionCount() + 1);
                ruleRepository.save(rule);

                // Lưu log thành công
                saveExecutionLog(rule, RuleExecutionLog.ExecutionStatus.SUCCESS,
                        true, conditionContext, performedActions, null, executionTime);

                return true;
            } else {
                log.debug(" Quy tắc '{}' - Điều kiện CHƯA THỎA MÃN", rule.getName());

                // Lưu log bỏ qua
                saveExecutionLog(rule, RuleExecutionLog.ExecutionStatus.SKIPPED,
                        false, conditionContext, Collections.emptyList(), null, executionTime);

                return false;
            }

        } catch (Exception e) {
            long executionTime = System.currentTimeMillis() - startTime;
            log.error(" Lỗi khi thực thi quy tắc '{}': {}", rule.getName(), e.getMessage(), e);

            // Lưu log lỗi
            saveExecutionLog(rule, RuleExecutionLog.ExecutionStatus.FAILED,
                    null, null, null, e.getMessage(), executionTime);

            return false;
        }
    }

    /**
     * Kiểm tra tất cả điều kiện của quy tắc
     */
    private boolean evaluateConditions(Rule rule, Map<String, Object> context,
            Map<String, SensorDataDTO> sensorDataCache) {
        if (rule.getConditions().isEmpty()) {
            log.warn("Quy tắc '{}' không có điều kiện nào", rule.getName());
            return false;
        }

        // Sắp xếp theo thứ tự
        List<RuleCondition> sortedConditions = rule.getConditions().stream()
                .sorted(Comparator.comparing(RuleCondition::getOrderIndex))
                .collect(Collectors.toList());

        boolean result = true;
        RuleCondition.LogicalOperator nextOperator = RuleCondition.LogicalOperator.AND;

        for (int i = 0; i < sortedConditions.size(); i++) {
            RuleCondition condition = sortedConditions.get(i);
            boolean conditionMet = evaluateSingleCondition(condition, context, sensorDataCache);

            // Kết hợp với điều kiện trước đó
            if (i == 0) {
                result = conditionMet;
            } else {
                if (nextOperator == RuleCondition.LogicalOperator.AND) {
                    result = result && conditionMet;
                } else {
                    result = result || conditionMet;
                }
            }

            // Lưu operator cho lần tiếp theo
            nextOperator = condition.getLogicalOperator();

            log.debug("  Điều kiện {}: {} {} {} = {}",
                    i + 1, condition.getField(), condition.getOperator(),
                    condition.getValue(), conditionMet);
        }

        return result;
    }

    /**
     * Kiểm tra một điều kiện đơn
     */
    private boolean evaluateSingleCondition(RuleCondition condition, Map<String, Object> context,
            Map<String, SensorDataDTO> sensorDataCache) {
        switch (condition.getType()) {
            case SENSOR_VALUE:
                return evaluateSensorCondition(condition, context, sensorDataCache);
            case TIME_RANGE:
                return evaluateTimeCondition(condition, context);
            case DEVICE_STATUS:
                // VVVV--- SỬA LẠI LỜI GỌI HÀM NÀY, BỎ sensorDataCache ---VVVV
                return evaluateDeviceStatusCondition(condition, context);
            case WEATHER:
                return evaluateWeatherCondition(condition, context);
            default:
                log.warn("Loại điều kiện không được hỗ trợ: {}", condition.getType());
                return false;
        }
    }

    /**
     * Kiểm tra điều kiện về giá trị cảm biến
     */
    private boolean evaluateSensorCondition(RuleCondition condition, Map<String, Object> context,
            Map<String, SensorDataDTO> sensorDataCache) {
        try {
            String deviceId = condition.getDeviceId();

            log.info(" [Rule Check] deviceId: {}, field: {}, operator: {}, value: {}",
                    deviceId, condition.getField(), condition.getOperator(), condition.getValue());

            if (deviceId == null || deviceId.isEmpty()) {
                log.warn(" [Rule Check] Thiếu deviceId cho điều kiện cảm biến");
                return false;
            }

            //  THÊM: Kiểm tra dữ liệu có tồn tại không
            if (!sensorDataService.hasRecentData(deviceId, 24)) {
                log.warn(" [Rule Check] Không có dữ liệu 24h gần nhất cho device: {}", deviceId);
                return false;
            }

            SensorDataDTO sensorData = sensorDataCache.get(deviceId);

            log.info(" [Rule Check] Sensor data từ InfluxDB: {}", sensorData != null ? "CÓ DỮ LIỆU" : "NULL");

            if (sensorData == null) {
                // Thêm log chi tiết hơn
                log.warn("Rule [{}]: Bỏ qua điều kiện vì không có dữ liệu cảm biến gần đây cho thiết bị [{}].",
                        condition.getRule().getName(), deviceId);
                return false;
            }



            // --- [FIX 2: KIỂM TRA ĐỘ "TƯƠI" CỦA DỮ LIỆU] ---
        if (sensorData.getTimestamp() != null) {
            java.time.Instant dataTime = sensorData.getTimestamp();
            java.time.Instant now = java.time.Instant.now();
            
            // Tính khoảng cách thời gian (phút)
            long minutesDiff = java.time.temporal.ChronoUnit.MINUTES.between(dataTime, now);
            
            // Ngưỡng chấp nhận: 15 phút. Nếu cũ hơn 15p -> Bỏ qua
            if (minutesDiff > 15) {
                log.warn(" [Rule Check] Dữ liệu từ thiết bị {} quá cũ ({} phút trước). Bỏ qua điều kiện.", 
                         deviceId, minutesDiff);
                return false; // Coi như điều kiện sai để an toàn
            }
        }
        // --- [KẾT THÚC FIX 2] ---

            Double actualValue = getSensorValue(sensorData, condition.getField());

            log.info(" [Rule Check] actualValue: {}, expectedValue: {}", actualValue, condition.getValue());

            if (actualValue == null) {
                log.warn("Rule [{}]: Không tìm thấy giá trị cho trường [{}] trên thiết bị [{}].",
                        condition.getRule().getName(), condition.getField(), deviceId);
                return false;
            }




            Double expectedValue = Double.parseDouble(condition.getValue());
            context.put(condition.getField(), actualValue);
            context.put(condition.getField() + "_expected", expectedValue);

            boolean result = compareValues(actualValue, condition.getOperator(), expectedValue);

            // <<< DÒNG LOG QUAN TRỌNG ĐƯỢC THÊM VÀO >>>
            log.info("[Rule Check] Quy tắc [{}]: Điều kiện [{} {} {}] -> {}. (Thực tế: {})",
                    condition.getRule().getName(),
                    condition.getField(),
                    condition.getOperator(),
                    expectedValue,
                    result ? "ĐÚNG" : "SAI",
                    actualValue);
            // <<< KẾT THÚC PHẦN THÊM MỚI >>>

            return result;

        } catch (Exception e) {
            log.error(" [Rule Check] Lỗi: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Kiểm tra điều kiện về thời gian
     */
    private boolean evaluateTimeCondition(RuleCondition condition, Map<String, Object> context) {
        try {
            LocalTime now = LocalTime.now();
            context.put("current_time", now.toString());

            // Format: "06:00-18:00" hoặc "06:00"
            String value = condition.getValue();

            if (value.contains("-")) {
                // Khoảng thời gian
                String[] parts = value.split("-");
                LocalTime start = LocalTime.parse(parts[0].trim());
                LocalTime end = LocalTime.parse(parts[1].trim());

                boolean inRange = now.isAfter(start) && now.isBefore(end);
                context.put("time_range", value);
                context.put("in_time_range", inRange);

                return inRange;
            } else {
                // Thời gian cụ thể
                LocalTime target = LocalTime.parse(value.trim());
                return now.isAfter(target) || now.equals(target);
            }

        } catch (Exception e) {
            log.error("Lỗi khi kiểm tra điều kiện thời gian: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Kiểm tra điều kiện về trạng thái thiết bị (ONLINE/OFFLINE).
     * Đã tối ưu hóa để chỉ truy vấn MySQL.
     */
    // VVVV--- VIẾT LẠI HOÀN TOÀN HÀM NÀY ---VVVV
    private boolean evaluateDeviceStatusCondition(RuleCondition condition, Map<String, Object> context) {
        try {
            String deviceId = condition.getDeviceId();
            if (deviceId == null || deviceId.isEmpty()) {
                return false;
            }

            Optional<Device> deviceOpt = deviceRepository.findByDeviceId(deviceId);
            if (deviceOpt.isEmpty()) {
                log.warn("Không tìm thấy thiết bị với ID '{}' cho điều kiện trạng thái.", deviceId);
                return false;
            }

            String currentStatus = deviceOpt.get().getStatus().name();
            String expectedStatus = condition.getValue().toUpperCase();

            context.put("device_" + deviceId + "_status", currentStatus);
            context.put("device_" + deviceId + "_expected_status", expectedStatus);

            boolean result = currentStatus.equals(expectedStatus);
            log.debug("  Kiểm tra trạng thái thiết bị {}: Hiện tại '{}' == Mong đợi '{}' -> {}", deviceId,
                    currentStatus, expectedStatus, result);

            return result;
        } catch (Exception e) {
            log.error("Lỗi khi kiểm tra trạng thái thiết bị: {}", e.getMessage());
            return false;
        }
    }
    // ^^^^---------------------------------------^^^^

    /**
     * So sánh giá trị
     */
    private boolean compareValues(Double actual, RuleCondition.Operator operator, Double expected) {
        switch (operator) {
            case EQUALS:
                return Math.abs(actual - expected) < 0.01;
            case NOT_EQUALS:
                return Math.abs(actual - expected) >= 0.01;
            case GREATER_THAN:
                return actual > expected;
            case GREATER_THAN_OR_EQUAL:
                return actual >= expected;
            case LESS_THAN:
                return actual < expected;
            case LESS_THAN_OR_EQUAL:
                return actual <= expected;
            default:
                return false;
        }
    }

    /**
     * Lấy giá trị cảm biến theo tên trường
     */
    private Double getSensorValue(SensorDataDTO data, String field) {
        if (field == null || data == null)
            return null;

        String normalizedField = field.toLowerCase().replace("_", "");

        //  So sánh với các chuỗi đã chuẩn hóa
        switch (normalizedField) {
            case "temperature":
                return data.getTemperature();
            case "humidity":
                return data.getHumidity();
            case "soilmoisture":
                return data.getSoilMoisture();
            case "lightintensity":
                return data.getLightIntensity();
            case "soilph":
                return data.getSoilPH();
            default:
                log.warn("Trường cảm biến không được hỗ trợ hoặc không có giá trị: {}", field);
                return null;
        }
    }

    /**
     * Thực hiện các hành động
     */
    private List<String> performActions(Rule rule, Set<String> devicesControlledInThisCycle) {
        List<String> performedActions = new ArrayList<>();

        for (Rule.RuleAction action : rule.getActions()) {
            try {





                String deviceId = action.getDeviceId();

                // --- [KIỂM TRA 1: XUNG ĐỘT QUY TẮC (PRIORITY)] ---
                if (deviceId != null && devicesControlledInThisCycle.contains(deviceId)) {
                    log.debug(" Quy tắc '{}' (Priority {}) bị bỏ qua cho thiết bị {} vì đã được xử lý bởi quy tắc ưu tiên cao hơn.", 
                              rule.getName(), rule.getPriority(), deviceId);
                    continue; // Bỏ qua action này
                }

                // --- [KIỂM TRA 2: MANUAL OVERRIDE (USER VS AUTO)] ---
                if (deviceId != null && Boolean.TRUE.equals(redisTemplate.hasKey(MANUAL_OVERRIDE_PREFIX + deviceId))) {
                    log.debug(" Quy tắc '{}' bị bỏ qua cho thiết bị {} vì đang ở chế độ Manual Override.", 
                              rule.getName(), deviceId);
                    continue; // Bỏ qua action này
                }

                // Thực hiện hành động
                String result = performSingleAction(rule, action);

                // Nếu hành động là điều khiển thiết bị, đánh dấu vào Set để chặn các quy tắc thấp hơn
                if (action.getType() == Rule.ActionType.TURN_ON_DEVICE || action.getType() == Rule.ActionType.TURN_OFF_DEVICE) {
                    if (deviceId != null) {
                        devicesControlledInThisCycle.add(deviceId);
                    }
                }

                // <<< GHI LOG Ở ĐÂY >>>
                String description = String.format("Quy tắc '%s' đã thực thi hành động: %s", rule.getName(), result);
                activityLogService.logSystemActivity(rule.getFarm().getId(), "RULE_EXECUTION", "RULE",
                        rule.getId().toString(), description, ActivityLog.LogStatus.SUCCESS, null);

                performedActions.add(result);
                log.info("  ✓ Đã thực hiện: {}", result);
            } catch (Exception e) {
                String error = "Lỗi khi thực hiện hành động: " + e.getMessage();
                performedActions.add(error);
                log.error("  ✗ {}", error);
            }
        }

        return performedActions;
    }

    /**
     * Thực hiện một hành động đơn
     */
    private String performSingleAction(Rule rule, Rule.RuleAction action) {
        switch (action.getType()) {
            case TURN_ON_DEVICE:
                return turnOnDevice(action);
            case TURN_OFF_DEVICE:
                return turnOffDevice(action);
            case SEND_NOTIFICATION:
                // VVVV--- GỌI HÀM MỚI ---VVVV
                return createRuleNotification(rule, action, false);
            // ^^^^--------------------^^^^
            case SEND_EMAIL:
                // VVVV--- GỌI HÀM MỚI ---VVVV
                return createRuleNotification(rule, action, true);
            // ^^^^--------------------^^^^
            default:
                return "Loại hành động không được hỗ trợ: " + action.getType();
        }
    }

    /**
     * Bật thiết bị
     */
    private String turnOnDevice(Rule.RuleAction action) {


        // 1. Lấy thông tin thiết bị mới nhất từ DB (để có trạng thái current_state)
    // Lưu ý: action.getDeviceId() trả về String deviceId (VD: "PUMP-001")
    Device device = deviceRepository.findByDeviceId(action.getDeviceId()).orElse(null);

    if (device == null) {
        return "Không tìm thấy thiết bị " + action.getDeviceId();
    }

    // 2. LOGIC CHỐNG SPAM: Nếu đã ON rồi thì thôi
    // Sử dụng equalsIgnoreCase để không phân biệt hoa thường ("ON", "on", "On")
    if ("ON".equalsIgnoreCase(device.getCurrentState())) {
        log.debug("Thiết bị {} đã ở trạng thái ON. Bỏ qua lệnh kích hoạt lại.", action.getDeviceId());
        return "SKIPPED: Thiết bị đã BẬT."; 
    }



        Map<String, Object> command = new HashMap<>();
        command.put("action", "turn_on");
        if (action.getDurationSeconds() != null) {
            command.put("duration", action.getDurationSeconds());
        }

        // <<< THAY ĐỔI QUAN TRỌNG Ở ĐÂY >>>
        // deviceService.controlDevice(action.getDeviceId(), "turn_on", command); //
        // Dòng cũ
        deviceService.internalControlDevice(action.getDeviceId(), "turn_on", command); // Dòng mới
        // <<< KẾT THÚC THAY ĐỔI >>>

        return String.format("Đã bật thiết bị %s trong %d giây",
                action.getDeviceId(),
                action.getDurationSeconds() != null ? action.getDurationSeconds() : 0);
    }

    /**
     * Tắt thiết bị
     */
    private String turnOffDevice(Rule.RuleAction action) {


        Device device = deviceRepository.findByDeviceId(action.getDeviceId()).orElse(null);

    if (device == null) {
        return "Không tìm thấy thiết bị " + action.getDeviceId();
    }

    // LOGIC CHỐNG SPAM: Nếu đã OFF rồi thì thôi
    if ("OFF".equalsIgnoreCase(device.getCurrentState())) {
        log.debug("Thiết bị {} đã ở trạng thái OFF. Bỏ qua lệnh tắt lại.", action.getDeviceId());
        return "SKIPPED: Thiết bị đã TẮT.";
    }


        Map<String, Object> command = new HashMap<>();
        command.put("action", "turn_off");

        // <<< THAY ĐỔI QUAN TRỌNG Ở ĐÂY >>>
        // deviceService.controlDevice(action.getDeviceId(), "turn_off", command); //
        // Dòng cũ
        deviceService.internalControlDevice(action.getDeviceId(), "turn_off", command); // Dòng mới
        // <<< KẾT THÚC THAY ĐỔI >>>

        return String.format("Đã tắt thiết bị %s", action.getDeviceId());
    }

    /**
     * Gửi thông báo
     */
    // private String sendNotification(Rule rule, Rule.RuleAction action) {
    // Map<String, Object> notification = new HashMap<>();
    // notification.put("type", "RULE_TRIGGERED");
    // notification.put("ruleName", rule.getName());
    // notification.put("message", action.getMessage());
    // notification.put("timestamp", LocalDateTime.now().toString());

    // webSocketService.sendAlert(rule.getFarm().getId(), notification);

    // return "Đã gửi thông báo: " + action.getMessage();
    // }

    /**
     * Gửi email
     */
    // private String sendEmailForRule(Rule rule, Rule.RuleAction action) {
    // User owner = rule.getFarm().getOwner();
    // if (owner == null) {
    // return "Lỗi: Không tìm thấy chủ nông trại.";
    // }
    // String title = "Quy tắc đã kích hoạt: " + rule.getName();
    // String link = "/rules/edit/" + rule.getId();

    // // VVVV--- SỬA LẠI ĐỂ GỌI NOTIFICATIONSERVICE ---VVVV
    // notificationService.createAndSendNotification(
    // owner,
    // title,
    // action.getMessage(),
    // Notification.NotificationType.RULE_TRIGGERED,
    // link,
    // false // Không cần gửi email thêm lần nữa
    // );
    // // ^^^^-----------------------------------------^^^^

    // return "Đã tạo thông báo (từ quy tắc) cho: " + owner.getEmail();
    // }

    /**
     * Lưu log thực thi
     */
    private void saveExecutionLog(Rule rule, RuleExecutionLog.ExecutionStatus status,
            Boolean conditionsMet, Map<String, Object> conditionContext,
            List<String> actions, String errorMessage, long executionTime) {
        try {
            RuleExecutionLog log = RuleExecutionLog.builder()
                    .rule(rule)
                    .executedAt(LocalDateTime.now())
                    .status(status)
                    .conditionsMet(conditionsMet)
                    .conditionDetails(
                            conditionContext != null ? objectMapper.writeValueAsString(conditionContext) : null)
                    .actionsPerformed(actions != null ? objectMapper.writeValueAsString(actions) : null)
                    .errorMessage(errorMessage)
                    .executionTimeMs(executionTime)
                    .build();

            logRepository.save(log);

        } catch (JsonProcessingException e) {
            log.error("Lỗi khi lưu execution log: {}", e.getMessage());
        }
    }

    private boolean evaluateWeatherCondition(RuleCondition condition, Map<String, Object> context) {
        try {
            Long farmId = condition.getRule().getFarm().getId();
            WeatherDTO weather = weatherService.getCurrentWeather(farmId);

            if (weather == null) {
                log.warn("Không có dữ liệu thời tiết cho farm {}", farmId);
                return false;
            }

            String field = condition.getField().toLowerCase();
            Double actualValue = null;

            switch (field) {
                case "rain_amount":
                case "rain":
                    actualValue = weather.getRainAmount();
                    break;
                case "temperature":
                    actualValue = weather.getTemperature();
                    break;
                case "humidity":
                    actualValue = weather.getHumidity();
                    break;
                case "wind_speed":
                    actualValue = weather.getWindSpeed();
                    break;
                default:
                    log.warn("Trường thời tiết không được hỗ trợ: {}", field);
                    return false;
            }

            if (actualValue == null) {
                return false;
            }

            Double expectedValue = Double.parseDouble(condition.getValue());
            context.put("weather_" + field, actualValue);
            context.put("weather_" + field + "_expected", expectedValue);

            boolean result = compareValues(actualValue, condition.getOperator(), expectedValue);

            log.info(" Kiểm tra thời tiết: {} {} {} = {}",
                    actualValue, condition.getOperator(), expectedValue, result);

            return result;

        } catch (Exception e) {
            log.error("Lỗi khi kiểm tra điều kiện thời tiết: {}", e.getMessage());
            return false;
        }
    }

    // VVVV--- HỢP NHẤT `sendNotification` VÀ `sendEmailForRule` THÀNH MỘT HÀM DUY
    // NHẤT ---VVVV
    /**
     * Tạo thông báo (và gửi email nếu cần) cho một Rule được kích hoạt.
     */
    private String createRuleNotification(Rule rule, Rule.RuleAction action, boolean sendEmail) {
        User owner = rule.getFarm().getOwner();
        if (owner == null) {
            return "Lỗi: Không tìm thấy chủ nông trại.";
        }


        // [LOGIC MỚI]: Kiểm tra Cooldown riêng cho thông báo (60 phút)
        String notificationCooldownKey = "rule:notification:cooldown:" + rule.getId();
        
        // Nếu key tồn tại -> Đã gửi thông báo gần đây -> Bỏ qua
        if (Boolean.TRUE.equals(redisTemplate.hasKey(notificationCooldownKey))) {
            return "SKIPPED: Đã gửi thông báo cho quy tắc này trong vòng 60 phút qua.";
        }

        String title = "Quy tắc đã kích hoạt: " + rule.getName();
        String message = action.getMessage() != null && !action.getMessage().isEmpty()
                ? action.getMessage()
                : "Hành động " + action.getType() + " đã được thực hiện.";
        String link = "/rules/edit/" + rule.getId();

        notificationService.createAndSendNotification(
                owner,
                title,
                message,
                Notification.NotificationType.RULE_TRIGGERED,
                link,
                sendEmail // QUAN TRỌNG: Dùng cờ để quyết định gửi email
        );

        String logMessage = "Đã tạo thông báo (từ quy tắc) cho: " + owner.getEmail();
        if (sendEmail) {
            logMessage += " và đã yêu cầu gửi email.";
        }
        return logMessage;
    }
    // ^^^^---------------------------------------------------------------------------------^^^^

}