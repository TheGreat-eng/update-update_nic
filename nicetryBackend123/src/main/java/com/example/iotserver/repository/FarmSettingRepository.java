package com.example.iotserver.repository;

import com.example.iotserver.entity.FarmSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FarmSettingRepository extends JpaRepository<FarmSetting, Long> {
    Optional<FarmSetting> findByFarmIdAndKey(Long farmId, String key);

    List<FarmSetting> findByFarmId(Long farmId);
}