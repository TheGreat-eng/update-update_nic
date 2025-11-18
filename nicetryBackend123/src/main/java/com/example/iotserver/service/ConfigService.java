// TẠO FILE MỚI: src/main/java/com/example/iotserver/service/ConfigService.java
package com.example.iotserver.service;

import com.example.iotserver.entity.*;
import com.example.iotserver.repository.FarmSettingRepository;
import com.example.iotserver.repository.PlantProfileSettingRepository;
import com.example.iotserver.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConfigService {

    private final FarmSettingRepository farmSettingRepository;
    private final PlantProfileSettingRepository plantProfileSettingRepository;
    private final SystemSettingRepository systemSettingRepository;

    /**
     * Lấy giá trị cài đặt kiểu Double theo hệ thống phân cấp ưu tiên:
     * 1. Cài đặt riêng của Farm (FarmSetting)
     * 2. Cài đặt theo Hồ sơ cây trồng của Zone (PlantProfileSetting)
     * 3. Cài đặt mặc định của hệ thống (SystemSetting)
     * 4. Giá trị mặc định cứng (fallback)
     */
    @Cacheable(value = "resolvedSettings", key = "#farm.id + ':' + (#zone != null ? #zone.id : 'null') + ':' + #key")
    public Double getDouble(Farm farm, Zone zone, String key, Double defaultValue) {
        // Ưu tiên 1: FarmSetting
        Optional<FarmSetting> farmSettingOpt = farmSettingRepository.findByFarmIdAndKey(farm.getId(), key);
        if (farmSettingOpt.isPresent()) {
            log.debug("[Config] Using Farm-Specific setting for key '{}' in Farm '{}'", key, farm.getId());
            return Double.parseDouble(farmSettingOpt.get().getValue());
        }

        // Ưu tiên 2: PlantProfileSetting (từ Zone)
        if (zone != null && zone.getPlantProfile() != null) {
            Optional<PlantProfileSetting> profileSettingOpt = plantProfileSettingRepository
                    .findByProfileIdAndKey(zone.getPlantProfile().getId(), key);
            if (profileSettingOpt.isPresent()) {
                log.debug("[Config] Using Plant Profile '{}' setting for key '{}'", zone.getPlantProfile().getName(),
                        key);
                return Double.parseDouble(profileSettingOpt.get().getValue());
            }
        }

        // Ưu tiên 3: SystemSetting
        Optional<SystemSetting> systemSettingOpt = systemSettingRepository.findById(key);
        if (systemSettingOpt.isPresent()) {
            log.debug("[Config] Using System Default setting for key '{}'", key);
            return Double.parseDouble(systemSettingOpt.get().getValue());
        }

        log.warn("[Config] No setting found for key '{}'. Using hardcoded default value.", key);
        return defaultValue;
    }
}