// src/main/java/com/example/iotserver/service/ZoneService.java
package com.example.iotserver.service;

import com.example.iotserver.dto.ZoneDTO;
import com.example.iotserver.entity.Farm;
import com.example.iotserver.entity.User;
import com.example.iotserver.entity.Zone;
import com.example.iotserver.enums.FarmRole;
import com.example.iotserver.exception.ResourceNotFoundException;
import com.example.iotserver.repository.FarmRepository;
import com.example.iotserver.repository.ZoneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ZoneService {
    private final ZoneRepository zoneRepository;
    private final FarmRepository farmRepository;
    private final FarmService farmService;
    private final AuthenticationService authenticationService;

    // CRUD operations...
    @Transactional
    public ZoneDTO createZone(Long farmId, ZoneDTO zoneDTO) {
        User currentUser = authenticationService.getCurrentAuthenticatedUser();
        farmService.checkUserPermissionForFarm(currentUser.getId(), farmId, FarmRole.OPERATOR);
        Farm farm = farmRepository.findById(farmId)
                .orElseThrow(() -> new ResourceNotFoundException("Farm", "id", farmId));

        Zone zone = new Zone();
        zone.setName(zoneDTO.getName());
        zone.setDescription(zoneDTO.getDescription());
        zone.setFarm(farm);

        return mapToDTO(zoneRepository.save(zone));
    }

    public List<ZoneDTO> getZonesByFarm(Long farmId) {
        // Check permission
        return zoneRepository.findByFarmId(farmId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    // VVVV--- THÊM/SỬA CÁC PHƯƠNG THỨC NÀY ---VVVV

    public ZoneDTO getZoneById(Long zoneId) {
        User currentUser = authenticationService.getCurrentAuthenticatedUser();
        Zone zone = zoneRepository.findById(zoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Zone", "id", zoneId));
        // Kiểm tra quyền truy cập vào farm chứa zone này
        farmService.checkUserAccessToFarm(currentUser.getId(), zone.getFarm().getId());
        return mapToDTO(zone);
    }

    @Transactional
    public ZoneDTO updateZone(Long zoneId, ZoneDTO zoneDTO) {
        User currentUser = authenticationService.getCurrentAuthenticatedUser();
        Zone zone = zoneRepository.findById(zoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Zone", "id", zoneId));
        // Kiểm tra quyền OPERATOR trở lên
        farmService.checkUserPermissionForFarm(currentUser.getId(), zone.getFarm().getId(), FarmRole.OPERATOR);

        zone.setName(zoneDTO.getName());
        zone.setDescription(zoneDTO.getDescription());

        return mapToDTO(zoneRepository.save(zone));
    }

    @Transactional
    public void deleteZone(Long zoneId) {
        User currentUser = authenticationService.getCurrentAuthenticatedUser();
        Zone zone = zoneRepository.findById(zoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Zone", "id", zoneId));
        // Kiểm tra quyền OPERATOR trở lên
        farmService.checkUserPermissionForFarm(currentUser.getId(), zone.getFarm().getId(), FarmRole.OPERATOR);

        // Trước khi xóa, set zone_id của các device thành null
        zone.getDevices().forEach(device -> device.setZone(null));

        zoneRepository.delete(zone);
    }

    private ZoneDTO mapToDTO(Zone zone) {
        return ZoneDTO.builder()
                .id(zone.getId())
                .name(zone.getName())
                .description(zone.getDescription())
                .farmId(zone.getFarm().getId())
                .deviceCount((long) zone.getDevices().size())
                .build();
    }
}