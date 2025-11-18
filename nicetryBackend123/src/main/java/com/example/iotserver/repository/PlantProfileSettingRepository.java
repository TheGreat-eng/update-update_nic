// TẠO FILE MỚI: src/main/java/com/example/iotserver/repository/PlantProfileSettingRepository.java
package com.example.iotserver.repository;

import com.example.iotserver.entity.PlantProfile;
import com.example.iotserver.entity.PlantProfileSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlantProfileSettingRepository extends JpaRepository<PlantProfileSetting, Long> {
    Optional<PlantProfileSetting> findByProfileIdAndKey(Long profileId, String key);

    // VVVV--- THÊM 2 HÀM NÀY ---VVVV
    List<PlantProfileSetting> findByProfile(PlantProfile profile);

    void deleteAll(Iterable<? extends PlantProfileSetting> entities);
    // ^^^^-----------------------^^^^
}