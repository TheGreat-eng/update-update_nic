package com.example.iotserver.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.iotserver.entity.ZoneSetting;

@Repository
public interface ZoneSettingRepository extends JpaRepository<ZoneSetting, Long> {
    Optional<ZoneSetting> findByZoneIdAndKey(Long zoneId, String key);
    List<ZoneSetting> findByZoneId(Long zoneId);
}