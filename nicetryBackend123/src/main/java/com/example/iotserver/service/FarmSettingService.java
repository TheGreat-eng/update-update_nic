package com.example.iotserver.service;

import com.example.iotserver.dto.SettingDTO;
import com.example.iotserver.entity.Farm;
import com.example.iotserver.entity.FarmSetting;
import com.example.iotserver.entity.SystemSetting;
import com.example.iotserver.exception.ResourceNotFoundException;
import com.example.iotserver.repository.FarmRepository;
import com.example.iotserver.repository.FarmSettingRepository;
import com.example.iotserver.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FarmSettingService {

    private final FarmSettingRepository farmSettingRepository;
    private final SystemSettingRepository systemSettingRepository;
    private final FarmRepository farmRepository;

    // Lấy giá trị của một cài đặt, ưu tiên farm, fallback về system
    @Cacheable(value = "farmSettings", key = "#farmId + ':' + #key")
    public String getString(Long farmId, String key, String defaultValue) {
        return farmSettingRepository.findByFarmIdAndKey(farmId, key)
                .map(FarmSetting::getValue)
                .orElseGet(() -> systemSettingRepository.findById(key)
                        .map(SystemSetting::getValue)
                        .orElse(defaultValue));
    }

    public Double getDouble(Long farmId, String key, Double defaultValue) {
        try {
            return Double.parseDouble(getString(farmId, key, defaultValue.toString()));
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    // Lấy tất cả cài đặt có thể cấu hình cho một farm
    public List<SettingDTO> getFarmConfigurableSettings(Long farmId) {
        // Lấy tất cả cài đặt hệ thống có thể cấu hình
        List<SystemSetting> allSystemSettings = systemSettingRepository.findAll().stream()
                .filter(s -> s.getKey().startsWith("PLANT_HEALTH_") || s.getKey().startsWith("SENSOR_"))
                .collect(Collectors.toList());

        // Lấy các cài đặt riêng của farm này
        Map<String, String> farmSpecificSettings = farmSettingRepository.findByFarmId(farmId).stream()
                .collect(Collectors.toMap(FarmSetting::getKey, FarmSetting::getValue));

        // TODO: Mở rộng để lấy Plant Profile của Farm/Zone nếu cần thiết cho ngữ cảnh
        // chung
        // Hiện tại, ta chỉ so sánh với System Settings làm baseline

        return allSystemSettings.stream().map(systemSetting -> {
            String key = systemSetting.getKey();
            String currentValue = farmSpecificSettings.get(key);

            // Hiện tại, chúng ta tạm coi SystemSetting là defaultValue.
            // Có thể nâng cấp để lấy từ PlantProfile nếu Farm có gán Profile mặc định.
            String defaultValue = systemSetting.getValue();
            String source = "Hệ thống";

            return SettingDTO.builder()
                    .key(key)
                    .value(currentValue) // Có thể là null nếu user chưa override
                    .defaultValue(defaultValue)
                    .source(source)
                    .description(systemSetting.getDescription())
                    .build();
        }).collect(Collectors.toList());
    }

    // Cập nhật cài đặt cho farm
    @Transactional
    @CacheEvict(value = { "farmSettings", "resolvedSettings" }, allEntries = true)
    public void updateFarmSettings(Long farmId, Map<String, String> settings) {
        Farm farm = farmRepository.findById(farmId)
                .orElseThrow(() -> new ResourceNotFoundException("Farm", "id", farmId));

        settings.forEach((key, value) -> {
            Optional<FarmSetting> existingSettingOpt = farmSettingRepository.findByFarmIdAndKey(farmId, key);

            if (value != null && !value.isBlank()) {
                // Nếu có giá trị mới -> Cập nhật hoặc tạo mới
                FarmSetting setting = existingSettingOpt.orElse(new FarmSetting(null, farm, key, value));
                setting.setValue(value);
                farmSettingRepository.save(setting);
            } else {
                // Nếu giá trị mới là rỗng hoặc null -> Xóa setting override, quay về mặc định
                existingSettingOpt.ifPresent(farmSettingRepository::delete);
            }
        });
    }
}