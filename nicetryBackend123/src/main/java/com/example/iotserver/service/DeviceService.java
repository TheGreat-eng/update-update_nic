package com.example.iotserver.service;

import com.example.iotserver.dto.DeviceDTO;
import com.example.iotserver.dto.SensorDataDTO;
import com.example.iotserver.enums.DeviceStatus;
import com.example.iotserver.enums.DeviceType;
import com.example.iotserver.repository.DeviceRepository;
import com.example.iotserver.repository.FarmRepository;
import com.example.iotserver.repository.ZoneRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
// <<<< THÊM IMPORT
import com.example.iotserver.entity.*;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.cache.annotation.Cacheable; // <-- THÊM IMPORT
import org.springframework.cache.annotation.CacheEvict; // <-- THÊM IMPORT
import java.time.temporal.ChronoUnit; // <<<< 1. THÊM IMPORT
import java.util.UUID; // Thêm import này

import com.example.iotserver.enums.FarmRole; // <<<< THÊM IMPORT
import com.example.iotserver.exception.ResourceNotFoundException;

@Service
@Slf4j
@RequiredArgsConstructor
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final FarmRepository farmRepository;
    private final SensorDataService sensorDataService;
    private final WebSocketService webSocketService; // Thêm dependency này
    // private final EmailService emailService; // <<<< 2. INJECT EMAILSERVICE
    private final NotificationService notificationService; // <<<< THAY BẰNG DÒNG NÀY

    // VVVV--- THÊM DÒNG NÀY ---VVVV
    private final ZoneRepository zoneRepository;
    // ^^^^-----------------------^^^^

    private final AuthenticationService authenticationService; // <<<< THÊM
    private final FarmService farmService; // <<<< THÊM

    // ✅ THÊM: Inject MQTT Gateway
    private final MqttGateway mqttGateway;

    // VVVV--- SỬA LẠI PHƯƠNG THỨC `createDevice` ---VVVV
    @Transactional
    public DeviceDTO createDevice(Long farmId, DeviceDTO dto) {
        User currentUser = authenticationService.getCurrentAuthenticatedUser();
        farmService.checkUserPermissionForFarm(currentUser.getId(), farmId, FarmRole.OPERATOR);

        Farm farm = farmRepository.findById(farmId)
                .orElseThrow(() -> new ResourceNotFoundException("Farm not found"));

        String finalDeviceId;
        if (dto.getDeviceId() != null && !dto.getDeviceId().isBlank()) {
            // Trường hợp 1: Admin đăng ký trước thiết bị với MAC address
            finalDeviceId = dto.getDeviceId().replace(":", "").toUpperCase();
        } else {
            // Trường hợp 2: Tạo thiết bị ảo/test, tự sinh UUID
            finalDeviceId = "VIRT-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();
        }

        if (deviceRepository.existsByDeviceId(finalDeviceId)) {
            throw new RuntimeException("Device ID " + finalDeviceId + " đã tồn tại.");
        }

        Device device = new Device();
        device.setDeviceId(finalDeviceId);
        device.setName(dto.getName());
        device.setDescription(dto.getDescription());
        device.setType(parseDeviceType(dto.getType()));
        device.setStatus(DeviceStatus.OFFLINE);
        device.setFarm(farm); // Gán farm ngay lập tức

        if (dto.getZoneId() != null) {
            Zone zone = zoneRepository.findById(dto.getZoneId())
                    .orElseThrow(() -> new ResourceNotFoundException("Zone", "id", dto.getZoneId()));
            if (!zone.getFarm().getId().equals(farm.getId())) {
                throw new IllegalArgumentException("Zone không thuộc về Farm này.");
            }
            device.setZone(zone);
        }

        Device saved = deviceRepository.save(device);
        log.info("Đã tạo thiết bị thủ công: {} cho nông trại: {}", saved.getDeviceId(), farmId);
        return mapToDetailedDTO(saved);
    }
    // ^^^^----------------------------------------------------^^^^

    // VVVV--- SỬA LẠI PHƯƠNG THỨC `updateDevice` ĐỂ XỬ LÝ "CLAIM" ---VVVV
    @Transactional
    @CacheEvict(value = "devices", key = "#deviceId")
    public DeviceDTO updateDevice(Long deviceId, DeviceDTO dto) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Device", "id", deviceId));

        // Nếu thiết bị chưa có farm (đang claim), gán farm từ DTO
        if (device.getFarm() == null && dto.getFarmId() != null) {
            Farm farmToAssign = farmRepository.findById(dto.getFarmId())
                    .orElseThrow(() -> new ResourceNotFoundException("Farm", "id", dto.getFarmId()));
            device.setFarm(farmToAssign);
        }

        // Kiểm tra quyền sau khi đã có thông tin farm
        User currentUser = authenticationService.getCurrentAuthenticatedUser();
        farmService.checkUserPermissionForFarm(currentUser.getId(), device.getFarm().getId(), FarmRole.OPERATOR);

        if (dto.getName() != null)
            device.setName(dto.getName());
        if (dto.getDescription() != null)
            device.setDescription(dto.getDescription());
        if (dto.getType() != null)
            device.setType(parseDeviceType(dto.getType())); // Cho phép đổi type

        if (dto.getZoneId() != null) {
            Zone zone = zoneRepository.findById(dto.getZoneId())
                    .orElseThrow(() -> new ResourceNotFoundException("Zone", "id", dto.getZoneId()));
            if (!zone.getFarm().getId().equals(device.getFarm().getId())) {
                throw new IllegalArgumentException("Zone không thuộc về Farm này.");
            }
            device.setZone(zone);
        } else {
            device.setZone(null); // Cho phép bỏ thiết bị ra khỏi zone
        }

        Device updated = deviceRepository.save(device);
        log.info("Đã cập nhật thiết bị: {}", updated.getDeviceId());
        return mapToDetailedDTO(updated);
    }
    // ^^^^----------------------------------------------------^^^^

    // VVVV--- THÊM 2 PHƯƠNG THỨC MỚI DƯỚI ĐÂY ---VVVV
    @Transactional
    public DeviceDTO registerDeviceByMac(String macAddress) {
        String standardizedId = macAddress.replace(":", "").toUpperCase();

        return deviceRepository.findByDeviceId(standardizedId)
                .map(existingDevice -> {
                    log.info("Thiết bị đã tồn tại với MAC {} được xác thực lại.", standardizedId);
                    return mapToDetailedDTO(existingDevice);
                })
                .orElseGet(() -> {
                    log.info("Đăng ký thiết bị mới với MAC {}.", standardizedId);
                    Device newDevice = new Device();
                    newDevice.setDeviceId(standardizedId);
                    newDevice.setName("Thiết bị mới - " + standardizedId.substring(6)); // Tên tạm thời
                    newDevice.setStatus(DeviceStatus.OFFLINE);
                    newDevice.setType(DeviceType.SENSOR_DHT22); // Type mặc định, người dùng sẽ sửa lại
                    // Quan trọng: device.setFarm(null);

                    Device savedDevice = deviceRepository.save(newDevice);
                    return mapToDetailedDTO(savedDevice);
                });
    }

    public List<DeviceDTO> getUnclaimedDevices() {
        return deviceRepository.findByFarmIsNull()
                .stream()
                .map(this::mapToDetailedDTO)
                .collect(Collectors.toList());
    }
    // ^^^^------------------------------------------^^^^

    @Transactional
    @CacheEvict(value = "devices", key = "#deviceId") // ✅ SỬA: Đổi thành #deviceId
    public void deleteDevice(Long deviceId) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found"));

        // <<<< BƯỚC KIỂM TRA QUYỀN >>>>
        User currentUser = authenticationService.getCurrentAuthenticatedUser();
        farmService.checkUserPermissionForFarm(currentUser.getId(), device.getFarm().getId(), FarmRole.OPERATOR);

        deviceRepository.delete(device);
        log.info("Deleted device: {}", device.getDeviceId());
    }

    @Cacheable(value = "devices", key = "#deviceId") // <-- THÊM ANNOTATION NÀY
    public DeviceDTO getDevice(Long deviceId) {
        log.info("DATABASE HIT: Lấy thông tin device với ID: {}", deviceId); // Thêm log để kiểm tra
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found"));
        return mapToDetailedDTO(device);
    }

    public DeviceDTO getDeviceWithLatestData(String deviceId) {
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found"));

        DeviceDTO dto = mapToDetailedDTO(device);

        // Get latest sensor data
        SensorDataDTO latestSensorData = sensorDataService.getLatestSensorData(deviceId);
        dto.setLatestSensorData(latestSensorData);

        return dto;
    }

    public List<DeviceDTO> getDevicesByFarm(Long farmId) {
        return deviceRepository.findByFarmId(farmId)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    // ✅ SỬA: Method này để lấy devices với data dạng Map
    public List<DeviceDTO> getDevicesByFarmWithData(Long farmId) {
        List<Device> devices = deviceRepository.findByFarmId(farmId);

        return devices.stream()
                .map(device -> {
                    DeviceDTO dto = mapToDTO(device);

                    // Get latest sensor data for this device
                    try {
                        SensorDataDTO sensorData = sensorDataService.getLatestSensorData(device.getDeviceId());

                        if (sensorData != null) {
                            // Set as SensorDataDTO object
                            dto.setLatestSensorData(sensorData);

                            // Also convert to Map for backward compatibility
                            Map<String, Object> dataMap = convertSensorDataToMap(sensorData);
                            dto.setLatestData(dataMap);
                        }
                    } catch (Exception e) {
                        log.warn("Failed to get sensor data for device {}: {}",
                                device.getDeviceId(), e.getMessage());
                    }

                    return dto;
                })
                .collect(Collectors.toList());
    }

    public List<DeviceDTO> getDevicesByFarmAndType(Long farmId, String type) {
        DeviceType deviceType = DeviceType.valueOf(type);
        return deviceRepository.findByFarmIdAndType(farmId, deviceType)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public List<DeviceDTO> getOnlineDevices(Long farmId) {
        return deviceRepository.findOnlineDevicesByFarmId(farmId)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    // --- Phương thức CÔNG KHAI, dành cho người dùng, có kiểm tra quyền ---
    @Transactional
    public void controlDevice(String deviceId, String action, Map<String, Object> params) {
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found"));

        // <<<< BƯỚC KIỂM TRA QUYỀN >>>>
        User currentUser = authenticationService.getCurrentAuthenticatedUser();
        farmService.checkUserPermissionForFarm(currentUser.getId(), device.getFarm().getId(), FarmRole.OPERATOR);

        if (!isActuator(device.getType())) {
            throw new RuntimeException("Device is not controllable");
        }

        // ✅ GỬI LỆNH QUA MQTT
        String topic = String.format("device/%s/control", deviceId);

        Map<String, Object> command = new HashMap<>();
        command.put("deviceId", deviceId);
        command.put("action", action);
        command.putAll(params);
        command.put("timestamp", LocalDateTime.now().toString());

        try {
            mqttGateway.sendToMqtt(new ObjectMapper().writeValueAsString(command), topic);
            log.info("✅ Đã gửi lệnh MQTT tới device {}: {} with params: {}", deviceId, action, params);
        } catch (Exception e) {
            log.error("❌ Lỗi khi gửi lệnh MQTT: {}", e.getMessage());
            throw new RuntimeException("Failed to send control command", e);
        }
    }

    // --- Phương thức NỘI BỘ, dành cho hệ thống, KHÔNG kiểm tra quyền ---
    @Transactional
    public void internalControlDevice(Device device, String action, Map<String, Object> params) {
        if (!isActuator(device.getType())) {
            log.warn("Attempted to control a non-actuator device: {}", device.getDeviceId());
            throw new IllegalArgumentException("Device is not a controllable actuator.");
        }

        // Gửi lệnh qua MQTT
        String topic = String.format("device/%s/control", device.getDeviceId());

        Map<String, Object> command = new HashMap<>();
        command.put("deviceId", device.getDeviceId());
        command.put("action", action);
        command.putAll(params);
        command.put("timestamp", LocalDateTime.now().toString());

        try {
            // ObjectMapper có thể không được inject, cần chắc chắn nó có sẵn
            ObjectMapper objectMapper = new ObjectMapper();
            mqttGateway.sendToMqtt(objectMapper.writeValueAsString(command), topic);
            log.info("✅ Đã gửi lệnh MQTT tới device {}: {} with params: {}", device.getDeviceId(), action, params);
        } catch (Exception e) {
            log.error("❌ Lỗi khi gửi lệnh MQTT: {}", e.getMessage());
            throw new RuntimeException("Failed to send control command", e);
        }
    }

    // <<< SỬA LẠI: internalControlDevice overload để nhận deviceId >>>
    @Transactional
    public void internalControlDevice(String deviceId, String action, Map<String, Object> params) {
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Device", "id", deviceId));
        internalControlDevice(device, action, params);
    }

    // SỬA LẠI HÀM NÀY
    @Transactional
    public void checkStaleDevices() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(5);
        List<Device> staleDevices = deviceRepository.findStaleDevices(threshold);

        for (Device device : staleDevices) {
            boolean statusChanged = false;
            // Bước 1: Cập nhật trạng thái nếu cần
            if (device.getStatus() == DeviceStatus.ONLINE) {
                device.setStatus(DeviceStatus.OFFLINE);
                statusChanged = true;
                log.warn("Device {} marked as offline due to inactivity", device.getDeviceId());
                webSocketService.sendDeviceStatus(device.getFarm().getId(), device.getDeviceId(), "OFFLINE");
            }

            // Bước 2: Logic quyết định có gửi thông báo hay không (COOLDOWN)
            // Gửi thông báo nếu:
            // 1. Chưa từng gửi (lastOfflineNotificationAt is null)
            // 2. Lần gửi cuối đã cách đây hơn 6 tiếng (tránh spam)
            boolean shouldNotify = device.getLastOfflineNotificationAt() == null ||
                    ChronoUnit.HOURS.between(device.getLastOfflineNotificationAt(), LocalDateTime.now()) >= 6;

            if (shouldNotify) {
                User owner = device.getFarm().getOwner();
                String title = String.format("Thiết bị '%s' đã offline", device.getName());
                String message = String.format("Thiết bị '%s' (ID: %s) tại nông trại '%s' đã mất kết nối quá 5 phút.",
                        device.getName(), device.getDeviceId(), device.getFarm().getName());
                String link = "/devices";

                notificationService.createAndSendNotification(
                        owner,
                        title,
                        message,
                        Notification.NotificationType.DEVICE_STATUS,
                        link,
                        true // Gửi email
                );

                // Bước 3: Cập nhật thời gian đã gửi thông báo
                device.setLastOfflineNotificationAt(LocalDateTime.now());
                log.info("Đã gửi thông báo offline cho thiết bị {} và cập nhật cooldown.", device.getDeviceId());

                // Lưu lại thay đổi (bao gồm cả status nếu có và thời gian thông báo)
                deviceRepository.save(device);
            } else if (statusChanged) {
                // Nếu chỉ có status thay đổi mà không gửi thông báo, vẫn cần lưu lại
                deviceRepository.save(device);
            }
        }
    }

    // Helper methods
    private String generateDeviceId() {
        return "DEV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private boolean isActuator(DeviceType type) {
        return type == DeviceType.ACTUATOR_PUMP ||
                type == DeviceType.ACTUATOR_FAN ||
                type == DeviceType.ACTUATOR_LIGHT;
    }

    // ✅ THÊM: Helper method to convert SensorDataDTO to Map
    private Map<String, Object> convertSensorDataToMap(SensorDataDTO sensorData) {
        Map<String, Object> map = new HashMap<>();

        if (sensorData.getDeviceId() != null) {
            map.put("deviceId", sensorData.getDeviceId());
        }
        if (sensorData.getSensorType() != null) {
            map.put("sensorType", sensorData.getSensorType());
        }
        if (sensorData.getTemperature() != null) {
            map.put("temperature", sensorData.getTemperature());
        }
        if (sensorData.getHumidity() != null) {
            map.put("humidity", sensorData.getHumidity());
        }
        if (sensorData.getSoilMoisture() != null) {
            map.put("soilMoisture", sensorData.getSoilMoisture());
        }
        if (sensorData.getLightIntensity() != null) {
            map.put("lightIntensity", sensorData.getLightIntensity());
        }
        if (sensorData.getSoilPH() != null) {
            map.put("soilPH", sensorData.getSoilPH());
        }
        if (sensorData.getTimestamp() != null) {
            map.put("timestamp", sensorData.getTimestamp().toString());
        }

        return map;
    }

    // VVVV--- SỬA LẠI TOÀN BỘ HÀM NÀY ---VVVV
    private DeviceDTO mapToDTO(Device device) {
        DeviceDTO.DeviceDTOBuilder builder = DeviceDTO.builder()
                .id(device.getId())
                .deviceId(device.getDeviceId())
                .name(device.getName())
                .description(device.getDescription())
                .type(device.getType().name())
                .status(device.getStatus().name())
                .lastSeen(device.getLastSeen())
                .metadata(device.getMetadata())
                .createdAt(device.getCreatedAt())
                .updatedAt(device.getUpdatedAt());

        // KIỂM TRA NULL TRƯỚC KHI TRUY CẬP
        if (device.getFarm() != null) {
            builder.farmId(device.getFarm().getId());
            builder.farmName(device.getFarm().getName());
            builder.farmLocation(device.getFarm().getLocation());
        }

        if (device.getZone() != null) {
            builder.zoneId(device.getZone().getId());
            builder.zoneName(device.getZone().getName());
        }

        DeviceDTO dto = builder.build();
        dto.calculateDerivedFields();
        return dto;
    }
    // ^^^^------------------------------------^^^^

    private DeviceDTO mapToDetailedDTO(Device device) {
        DeviceDTO dto = mapToDTO(device); // Đã gọi hàm đã sửa

        if (device.getMetadata() != null && !device.getMetadata().isEmpty()) {
            Map<String, Object> config = new HashMap<>();
            config.put("metadata", device.getMetadata());
            dto.setConfig(config);
        }

        return dto;
    }

    // ✅ THÊM: Helper method để map type linh hoạt
    private DeviceType parseDeviceType(String typeStr) {
        // Map các tên ngắn gọn sang tên đầy đủ
        Map<String, DeviceType> typeMapping = Map.of(
                "DHT22", DeviceType.SENSOR_DHT22,
                "SOIL_MOISTURE", DeviceType.SENSOR_SOIL_MOISTURE,
                "LIGHT", DeviceType.SENSOR_LIGHT,
                "PH", DeviceType.SENSOR_PH,
                "PUMP", DeviceType.ACTUATOR_PUMP,
                "FAN", DeviceType.ACTUATOR_FAN,
                "LIGHT_ACTUATOR", DeviceType.ACTUATOR_LIGHT);

        // Thử tìm trong map trước
        if (typeMapping.containsKey(typeStr)) {
            return typeMapping.get(typeStr);
        }

        // Nếu không có trong map, parse trực tiếp từ enum
        try {
            return DeviceType.valueOf(typeStr);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid device type: " + typeStr +
                    ". Valid types: "
                    + String.join(", ", Arrays.stream(DeviceType.values()).map(Enum::name).toArray(String[]::new)));
        }
    }
}
