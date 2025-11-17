package com.example.iotserver.service;

import com.example.iotserver.entity.SystemSetting;
import com.example.iotserver.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class SettingService {
    private final SystemSettingRepository settingRepository;

    @Cacheable(value = "settings", key = "#key")
    public String getString(String key, String defaultValue) {
        log.debug("Database hit for setting: {}", key);
        return settingRepository.findById(key)
                .map(SystemSetting::getValue)
                .orElse(defaultValue);
    }

    public Double getDouble(String key, Double defaultValue) {
        try {
            return Double.parseDouble(getString(key, defaultValue.toString()));
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    public Integer getInteger(String key, Integer defaultValue) {
        try {
            return Integer.parseInt(getString(key, defaultValue.toString()));
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    @CacheEvict(value = "settings", key = "#key")
    public void updateSetting(String key, String value) {
        SystemSetting setting = settingRepository.findById(key)
                .orElse(new SystemSetting(key, value, ""));
        setting.setValue(value);
        settingRepository.save(setting);
        log.info("Updated setting '{}' to '{}'", key, value);
    }
}