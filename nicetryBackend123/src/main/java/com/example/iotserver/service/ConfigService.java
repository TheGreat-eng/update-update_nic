package com.example.iotserver.service;

import java.util.Optional;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import com.example.iotserver.entity.Farm;
import com.example.iotserver.entity.FarmSetting;
import com.example.iotserver.entity.PlantProfileSetting;
import com.example.iotserver.entity.Zone;
import com.example.iotserver.entity.ZoneSetting;
import com.example.iotserver.repository.FarmSettingRepository;
import com.example.iotserver.repository.PlantProfileSettingRepository;
import com.example.iotserver.repository.SystemSettingRepository;
import com.example.iotserver.repository.ZoneSettingRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConfigService {

    private final FarmSettingRepository farmSettingRepository;
    private final PlantProfileSettingRepository plantProfileSettingRepository;
    private final SystemSettingRepository systemSettingRepository;
    private final ZoneSettingRepository zoneSettingRepository; // <--- INJECT MỚI

    @Cacheable(value = "resolvedSettings", key = "#farm.id + ':' + (#zone != null ? #zone.id : 'null') + ':' + #key")
    public Double getDouble(Farm farm, Zone zone, String key, Double defaultValue) {
        
        // === ƯU TIÊN 1: Cài đặt riêng của Zone (Zone Settings) ===
        if (zone != null) {
            Optional<ZoneSetting> zoneSettingOpt = zoneSettingRepository.findByZoneIdAndKey(zone.getId(), key);
            if (zoneSettingOpt.isPresent()) {
                log.debug("[Config] Dùng cài đặt riêng của Zone '{}': {} = {}", zone.getName(), key, zoneSettingOpt.get().getValue());
                return Double.parseDouble(zoneSettingOpt.get().getValue());
            }
        }

        // === ƯU TIÊN 2: Hồ sơ cây trồng (Plant Profile) ===
        if (zone != null && zone.getPlantProfile() != null) {
            Optional<PlantProfileSetting> profileSettingOpt = plantProfileSettingRepository
                    .findByProfileIdAndKey(zone.getPlantProfile().getId(), key);
            if (profileSettingOpt.isPresent()) {
                return Double.parseDouble(profileSettingOpt.get().getValue());
            }
        }

        // === ƯU TIÊN 3: Cài đặt chung của Farm (Fallback) ===
        Optional<FarmSetting> farmSettingOpt = farmSettingRepository.findByFarmIdAndKey(farm.getId(), key);
        if (farmSettingOpt.isPresent()) {
            return Double.parseDouble(farmSettingOpt.get().getValue());
        }

        // === ƯU TIÊN 4: Mặc định Hệ thống ===
        return systemSettingRepository.findById(key)
                .map(s -> Double.parseDouble(s.getValue()))
                .orElse(defaultValue);
    }
}