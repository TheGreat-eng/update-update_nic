package com.example.iotserver.service;

import com.example.iotserver.dto.FarmDTO;
import com.example.iotserver.entity.Farm;
import com.example.iotserver.entity.FarmMember; // <<<< THÊM IMPORT NÀY
import com.example.iotserver.entity.Rule;
import com.example.iotserver.entity.User;
import com.example.iotserver.enums.DeviceStatus;
import com.example.iotserver.exception.ResourceNotFoundException;
import com.example.iotserver.repository.DeviceRepository;
import com.example.iotserver.repository.FarmMemberRepository;
import com.example.iotserver.repository.FarmRepository;
import com.example.iotserver.repository.RuleRepository;
import com.example.iotserver.repository.UserRepository;
import com.example.iotserver.repository.WeatherRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;

import com.example.iotserver.enums.FarmRole;

@Service
@Slf4j
@RequiredArgsConstructor
public class FarmService {

    private final FarmRepository farmRepository;
    private final UserRepository userRepository;
    private final WeatherRepository weatherRepository;
    private final RuleRepository ruleRepository;
    private final DeviceRepository deviceRepository;
    private final RuleService ruleService; // Dùng lại logic xóa Rule phức tạp
    private final FarmMemberRepository farmMemberRepository; // <<<< THÊM VÀO
    private final AuthenticationService authenticationService; // Thêm nếu chưa có

    @Transactional
    public FarmDTO createFarm(Long userId, FarmDTO dto) {
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Farm farm = new Farm();
        farm.setName(dto.getName());
        farm.setDescription(dto.getDescription());
        farm.setLocation(dto.getLocation());
        farm.setArea(dto.getArea());
        farm.setOwner(owner);

        Farm saved = farmRepository.save(farm);
        log.info("Created farm: {} for user: {}", saved.getId(), userId);

        return mapToDTO(saved, userId);
    }

    @Transactional
    @CacheEvict(value = "farms", key = "#farmId") // <-- THÊM ANNOTATION NÀY
    public FarmDTO updateFarm(Long farmId, Long userId, FarmDTO dto) {
        checkUserAccessToFarm(userId, farmId); // Dòng này sẽ ném exception nếu không có quyền
        Farm farm = farmRepository.findById(farmId).get();

        if (!farm.getOwner().getId().equals(userId)) {
            throw new SecurityException("Chỉ chủ sở hữu mới có quyền sửa thông tin nông trại.");
        }

        if (dto.getName() != null)
            farm.setName(dto.getName());
        if (dto.getDescription() != null)
            farm.setDescription(dto.getDescription());
        if (dto.getLocation() != null)
            farm.setLocation(dto.getLocation());
        if (dto.getArea() != null)
            farm.setArea(dto.getArea());

        Farm updated = farmRepository.save(farm);
        log.info("Updated farm: {}", updated.getId());

        return mapToDTO(updated, userId);
    }

    @Transactional
    @CacheEvict(value = "farms", key = "#farmId") // <-- THÊM ANNOTATION NÀY
    public void deleteFarm(Long farmId, Long userId) {
        // <<<< SỬA LẠI LOGIC KIỂM TRA >>>>
        checkUserAccessToFarm(userId, farmId); // Kiểm tra có quyền truy cập không đã
        Farm farm = farmRepository.findById(farmId).get();

        // Chỉ chủ sở hữu mới được xóa
        if (!farm.getOwner().getId().equals(userId)) {
            throw new SecurityException("Chỉ chủ sở hữu mới có quyền xóa nông trại.");
        }

        // ====> THÊM LOGIC XÓA CÁC BẢN GHI CON <====

        // 1. Xóa dữ liệu thời tiết
        weatherRepository.deleteByFarmId(farmId); // Cần thêm method này vào WeatherRepository

        // 2. Xóa tất cả các quy tắc thuộc farm
        List<Rule> rulesToDelete = ruleRepository.findByFarmId(farmId);
        for (Rule rule : rulesToDelete) {
            ruleService.deleteRule(rule.getId()); // Tái sử dụng logic xóa rule đã có (xóa cả log)
        }

        // 3. Xóa tất cả các thiết bị thuộc farm
        deviceRepository.deleteByFarmId(farmId); // Cần thêm method này vào DeviceRepository

        // 4. Cuối cùng, xóa nông trại
        farmRepository.delete(farm);

        log.info("Đã xóa nông trại {} và tất cả dữ liệu liên quan", farmId);
    }

    @Cacheable(value = "farms", key = "#farmId") // <-- THÊM ANNOTATION NÀY
    public FarmDTO getFarm(Long farmId, Long userId) {
        log.info("DATABASE HIT: Lấy thông tin farm với ID: {}", farmId); // Thêm log để kiểm tra
        // <<<< SỬA LẠI LOGIC KIỂM TRA >>>>
        checkUserAccessToFarm(userId, farmId); // Chỉ cần gọi hàm này là đủ
        Farm farm = farmRepository.findById(farmId).get();

        if (!farm.getOwner().getId().equals(userId)) {
            throw new SecurityException("Chỉ chủ sở hữu mới có quyền sửa thông tin nông trại.");
        }

        return mapToDTO(farm, userId);
    }

    public List<FarmDTO> getUserFarms(Long userId) {
        return farmRepository.findByOwnerId(userId)
                .stream()
                .map(farm -> mapToDTO(farm, userId)) // <<<< SỬA LẠI LẦN GỌI NÀY >>>>
                .collect(Collectors.toList());
    }

    // Sửa lại các hàm gọi mapToDTO
    public List<FarmDTO> getFarmsWithAccess(Long userId) {
        return farmRepository.findFarmsByUserAccess(userId)
                .stream()
                // <<<< SỬA LẠI CÁCH GỌI NÀY (dùng lambda expression) >>>>
                .map(farm -> mapToDTO(farm, userId))
                .collect(Collectors.toList());
    }

    // <<<< SỬA LẠI PHƯƠNG THỨC MAP NÀY >>>>
    private FarmDTO mapToDTO(Farm farm, Long currentUserId) {
        long totalDevices = deviceRepository.countByFarmId(farm.getId());
        long onlineDevices = deviceRepository.countByFarmIdAndStatus(farm.getId(), DeviceStatus.ONLINE);

        FarmDTO dto = new FarmDTO();
        dto.setId(farm.getId());
        dto.setName(farm.getName());
        dto.setDescription(farm.getDescription());
        dto.setLocation(farm.getLocation());
        dto.setArea(farm.getArea());
        dto.setOwnerId(farm.getOwner().getId());
        dto.setOwnerName(farm.getOwner().getFullName());
        dto.setCreatedAt(farm.getCreatedAt());
        dto.setUpdatedAt(farm.getUpdatedAt());
        dto.setTotalDevices(totalDevices);
        dto.setOnlineDevices(onlineDevices);

        // Logic xác định vai trò
        if (farm.getOwner().getId().equals(currentUserId)) {
            dto.setCurrentUserRole("OWNER");
        } else {
            farmMemberRepository.findByFarmIdAndUserId(farm.getId(), currentUserId)
                    .ifPresent(member -> dto.setCurrentUserRole(member.getRole().name()));
        }

        return dto;
    }

    // <<<< THÊM PHƯƠNG THỨC KIỂM TRA QUYỀN TRUNG TÂM >>>>
    /**
     * Kiểm tra xem một người dùng có quyền truy cập vào nông trại hay không.
     * 
     * @param userId ID người dùng cần kiểm tra
     * @param farmId ID nông trại
     * @return true nếu có quyền, ngược lại ném SecurityException
     */
    public boolean checkUserAccessToFarm(Long userId, Long farmId) {
        Farm farm = farmRepository.findById(farmId)
                .orElseThrow(() -> new ResourceNotFoundException("Farm", "id", farmId));

        // 1. Kiểm tra có phải là chủ sở hữu không
        if (farm.getOwner().getId().equals(userId)) {
            return true;
        }

        // 2. Kiểm tra có phải là thành viên không
        if (farmMemberRepository.findByFarmIdAndUserId(farmId, userId).isPresent()) {
            return true;
        }

        throw new SecurityException(
                String.format("Người dùng ID %d không có quyền truy cập nông trại ID %d.", userId, farmId));
    }

    // <<<< THÊM PHƯƠNG THỨC MỚI NÀY >>>>
    /**
     * Kiểm tra xem người dùng có một vai trò cụ thể (hoặc cao hơn) trong nông trại
     * hay không.
     * 
     * @param userId       ID người dùng
     * @param farmId       ID nông trại
     * @param requiredRole Vai trò tối thiểu cần có (OWNER, OPERATOR, VIEWER)
     */
    public void checkUserPermissionForFarm(Long userId, Long farmId, FarmRole requiredRole) {
        Farm farm = farmRepository.findById(farmId)
                .orElseThrow(() -> new ResourceNotFoundException("Farm", "id", farmId));

        // 1. Chủ sở hữu luôn có mọi quyền
        if (farm.getOwner().getId().equals(userId)) {
            return; // OK
        }

        // 2. Kiểm tra vai trò của thành viên
        var memberOpt = farmMemberRepository.findByFarmIdAndUserId(farmId, userId);
        if (memberOpt.isPresent()) {
            FarmRole userRole = memberOpt.get().getRole();
            // OPERATOR có quyền của VIEWER, nhưng VIEWER không có quyền của OPERATOR
            if (requiredRole == FarmRole.OPERATOR && userRole == FarmRole.OPERATOR) {
                return; // OK
            }
            if (requiredRole == FarmRole.VIEWER && (userRole == FarmRole.OPERATOR || userRole == FarmRole.VIEWER)) {
                return; // OK
            }
        }

        // Nếu không thỏa mãn các điều kiện trên -> Ném lỗi
        throw new SecurityException(String.format(
                "Người dùng ID %d không có quyền '%s' cho nông trại ID %d.",
                userId, requiredRole, farmId));
    }

    @Transactional(readOnly = true)
    public List<FarmDTO> getFarmsByUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        List<Farm> ownedFarms = farmRepository.findByOwnerId(userId);
        List<FarmMember> memberships = farmMemberRepository.findByUserId(userId);

        List<FarmDTO> result = new ArrayList<>();

        // ✅ SET ROLE CHO OWNER
        for (Farm farm : ownedFarms) {
            FarmDTO dto = mapToDTO(farm, userId);
            dto.setCurrentUserRole("OWNER"); // ✅ QUAN TRỌNG
            log.debug("Farm {} - Owner role set for user {}", farm.getId(), userId);
            result.add(dto);
        }

        // ✅ SET ROLE CHO MEMBER
        for (FarmMember member : memberships) {
            FarmDTO dto = mapToDTO(member.getFarm(), userId);
            dto.setCurrentUserRole(member.getRole().name()); // OPERATOR hoặc VIEWER
            log.debug("Farm {} - Member role {} set for user {}", member.getFarm().getId(), member.getRole(), userId);
            result.add(dto);
        }

        return result;
    }
}
