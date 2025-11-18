// TẠO FILE MỚI: src/main/java/com/example/iotserver/service/PlantProfileService.java
package com.example.iotserver.service;

import com.example.iotserver.dto.PlantProfileDTO;
import com.example.iotserver.dto.PlantProfileSummaryDTO;
import com.example.iotserver.entity.PlantProfile;
import com.example.iotserver.entity.PlantProfileSetting;
import com.example.iotserver.exception.ResourceNotFoundException;
import com.example.iotserver.repository.PlantProfileRepository;
import com.example.iotserver.repository.PlantProfileSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlantProfileService {

    private final PlantProfileRepository profileRepository;
    private final PlantProfileSettingRepository settingRepository;

    // --- Dành cho Admin ---

    @Transactional
    public PlantProfileDTO createProfile(PlantProfileDTO dto) {
        PlantProfile profile = PlantProfile.builder()
                .name(dto.getName())
                .scientificName(dto.getScientificName())
                .description(dto.getDescription())
                .build();
        PlantProfile savedProfile = profileRepository.save(profile);

        if (dto.getSettings() != null) {
            updateProfileSettings(savedProfile, dto.getSettings());
        }

        return mapToDTO(savedProfile);
    }

    @Transactional
    public PlantProfileDTO updateProfile(Long profileId, PlantProfileDTO dto) {
        PlantProfile profile = profileRepository.findById(profileId)
                .orElseThrow(() -> new ResourceNotFoundException("PlantProfile", "id", profileId));

        profile.setName(dto.getName());
        profile.setScientificName(dto.getScientificName());
        profile.setDescription(dto.getDescription());

        if (dto.getSettings() != null) {
            updateProfileSettings(profile, dto.getSettings());
        }

        PlantProfile updatedProfile = profileRepository.save(profile);
        return mapToDTO(updatedProfile);
    }

    @Transactional
    public void deleteProfile(Long profileId) {
        if (!profileRepository.existsById(profileId)) {
            throw new ResourceNotFoundException("PlantProfile", "id", profileId);
        }
        // Các setting liên quan sẽ tự động bị xóa do `ON DELETE CASCADE`
        profileRepository.deleteById(profileId);
    }

    public PlantProfileDTO getProfileById(Long profileId) {
        PlantProfile profile = profileRepository.findById(profileId)
                .orElseThrow(() -> new ResourceNotFoundException("PlantProfile", "id", profileId));
        return mapToDTO(profile);
    }

    // VVVV--- BỔ SUNG PHƯƠNG THỨC NÀY ---VVVV
    public List<PlantProfileDTO> getAllFullProfiles() {
        return profileRepository.findAll().stream()
                .map(this::mapToDTO) // Dùng lại hàm mapToDTO đã có để lấy đầy đủ settings
                .collect(Collectors.toList());
    }
    // ^^^^----------------------------------^^^^

    // --- Dành cho tất cả User đã xác thực ---

    public List<PlantProfileSummaryDTO> getAllProfileSummaries() {
        return profileRepository.findAll().stream()
                .map(this::mapToSummaryDTO)
                .collect(Collectors.toList());
    }

    // --- Helper Methods ---

    private void updateProfileSettings(PlantProfile profile, Map<String, String> settings) {
        // Xóa các setting cũ để đảm bảo đồng bộ
        // (Cách làm đơn giản, có thể tối ưu hơn nếu cần)
        settingRepository.deleteAll(settingRepository.findByProfile(profile));

        List<PlantProfileSetting> newSettings = settings.entrySet().stream()
                .map(entry -> PlantProfileSetting.builder()
                        .profile(profile)
                        .key(entry.getKey())
                        .value(entry.getValue())
                        .build())
                .collect(Collectors.toList());

        settingRepository.saveAll(newSettings);
    }

    // VVVV--- THAY THẾ HOÀN TOÀN HÀM NÀY BẰNG PHIÊN BẢN ĐÃ SỬA ---VVVV
    private PlantProfileDTO mapToDTO(PlantProfile profile) {
        List<PlantProfileSetting> settings = settingRepository.findByProfile(profile);

        // SỬA ĐỔI QUAN TRỌNG: Thêm merge function (p1, p2) -> p2
        // Khi gặp 2 setting có cùng key, nó sẽ lấy cái sau cùng và bỏ qua cái trước,
        // thay vì ném ra lỗi "Duplicate key".
        Map<String, String> settingsMap = settings.stream()
                .collect(Collectors.toMap(
                        PlantProfileSetting::getKey,
                        PlantProfileSetting::getValue,
                        (existingValue, newValue) -> newValue // Đây là merge function
                ));

        return PlantProfileDTO.builder()
                .id(profile.getId())
                .name(profile.getName())
                .scientificName(profile.getScientificName())
                .description(profile.getDescription())
                .settings(settingsMap)
                .build();
    }
    // ^^^^---------------------------------------------------------^^^^

    private PlantProfileSummaryDTO mapToSummaryDTO(PlantProfile profile) {
        return new PlantProfileSummaryDTO(
                profile.getId(),
                profile.getName(),
                profile.getDescription());
    }

    // Thêm phương thức này vào PlantProfileSettingRepository
    // List<PlantProfileSetting> findByProfile(PlantProfile profile);
    // void deleteAll(Iterable<? extends PlantProfileSetting> entities);
}