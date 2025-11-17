package com.example.iotserver.service;

import com.example.iotserver.dto.SettingDTO;
import com.example.iotserver.entity.Farm;
import com.example.iotserver.entity.FarmSetting;
import com.example.iotserver.entity.SystemSetting;
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
        List<SystemSetting> allSystemSettings = systemSettingRepository.findAll();
        Map<String, String> farmSpecificSettings = farmSettingRepository.findByFarmId(farmId).stream()
                .collect(Collectors.toMap(FarmSetting::getKey, FarmSetting::getValue));

        return allSystemSettings.stream()
                // Chỉ lấy các cài đặt có thể tùy chỉnh (ví dụ, bắt đầu bằng "PLANT_HEALTH" hoặc
                // "SENSOR")
                .filter(s -> s.getKey().startsWith("PLANT_HEALTH_") || s.getKey().startsWith("SENSOR_"))
                .map(systemSetting -> new SettingDTO(
                        systemSetting.getKey(),
                        farmSpecificSettings.getOrDefault(systemSetting.getKey(), systemSetting.getValue()),
                        systemSetting.getDescription()))
                .collect(Collectors.toList());
    }

    // Cập nhật cài đặt cho farm
    @Transactional
    @CacheEvict(value = "farmSettings", allEntries = true) // Xóa toàn bộ cache của farmSettings khi cập nhật
    public void updateFarmSettings(Long farmId, Map<String, String> settings) {
        Farm farm = farmRepository.findById(farmId).orElseThrow();

        settings.forEach((key, value) -> {
            FarmSetting setting = farmSettingRepository.findByFarmIdAndKey(farmId, key)
                    .orElse(new FarmSetting(null, farm, key, value));

            setting.setValue(value);
            farmSettingRepository.save(setting);
        });
    }
}