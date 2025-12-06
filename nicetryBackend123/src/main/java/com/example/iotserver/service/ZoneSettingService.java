package com.example.iotserver.service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.iotserver.dto.SettingDTO;
import com.example.iotserver.entity.SystemSetting;
import com.example.iotserver.entity.Zone;
import com.example.iotserver.entity.ZoneSetting;
import com.example.iotserver.repository.SystemSettingRepository;
import com.example.iotserver.repository.ZoneRepository;
import com.example.iotserver.repository.ZoneSettingRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ZoneSettingService {

    private final ZoneSettingRepository zoneSettingRepository;
    private final SystemSettingRepository systemSettingRepository;
    private final ZoneRepository zoneRepository;

    // Lấy danh sách setting cho form frontend
    public List<SettingDTO> getZoneConfigurableSettings(Long zoneId) {
        // 1. Lấy danh sách các key hệ thống làm gốc
        List<SystemSetting> allSystemSettings = systemSettingRepository.findAll().stream()
                .filter(s -> s.getKey().startsWith("PLANT_HEALTH_") || s.getKey().startsWith("SENSOR_"))
                .collect(Collectors.toList());

        // 2. Lấy giá trị hiện tại của Zone
        Map<String, String> zoneSpecificSettings = zoneSettingRepository.findByZoneId(zoneId).stream()
                .collect(Collectors.toMap(ZoneSetting::getKey, ZoneSetting::getValue));

        return allSystemSettings.stream().map(systemSetting -> {
            String key = systemSetting.getKey();
            String currentValue = zoneSpecificSettings.get(key);
            
            // Placeholder sẽ hiển thị giá trị mặc định của hệ thống
            String defaultValue = systemSetting.getValue(); 

            return SettingDTO.builder()
                    .key(key)
                    .value(currentValue)
                    .defaultValue(defaultValue)
                    .source("Hệ thống")
                    .description(systemSetting.getDescription())
                    .build();
        }).collect(Collectors.toList());
    }

    // Lưu setting
    @Transactional
    // Xóa cache "resolvedSettings" để ConfigService phải tính lại
    @CacheEvict(value = "resolvedSettings", allEntries = true) 
    public void updateZoneSettings(Long zoneId, Map<String, String> settings) {
        Zone zone = zoneRepository.findById(zoneId)
                .orElseThrow(() -> new RuntimeException("Zone not found"));

        settings.forEach((key, value) -> {
            Optional<ZoneSetting> existingOpt = zoneSettingRepository.findByZoneIdAndKey(zoneId, key);

            if (value != null && !value.isBlank()) {
                ZoneSetting setting = existingOpt.orElse(new ZoneSetting(null, zone, key, value));
                setting.setValue(value);
                zoneSettingRepository.save(setting);
            } else {
                // Nếu để trống -> Xóa setting riêng -> Sẽ dùng Profile hoặc Farm setting
                existingOpt.ifPresent(zoneSettingRepository::delete);
            }
        });
    }
}