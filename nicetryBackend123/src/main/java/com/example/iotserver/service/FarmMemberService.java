package com.example.iotserver.service;

import com.example.iotserver.dto.FarmMemberDTO; // <<<< THÊM IMPORT NÀY
import com.example.iotserver.dto.UserDTO;
import com.example.iotserver.entity.Farm;
import com.example.iotserver.entity.FarmMember;
import com.example.iotserver.entity.User;
import com.example.iotserver.enums.FarmRole;
import com.example.iotserver.exception.ResourceNotFoundException;
import com.example.iotserver.repository.FarmMemberRepository;
import com.example.iotserver.repository.FarmRepository;
import com.example.iotserver.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.stream.Collectors; // <<<< Thêm import

import java.util.List;

@Service
@RequiredArgsConstructor
public class FarmMemberService {
    private final FarmRepository farmRepository;
    private final UserRepository userRepository;
    private final FarmMemberRepository farmMemberRepository;
    private final AuthenticationService authenticationService;
    private final FarmService farmService;

    @Transactional
    public FarmMember addMember(Long farmId, String memberEmail, FarmRole role) {
        User currentUser = authenticationService.getCurrentAuthenticatedUser();
        Farm farm = farmRepository.findById(farmId)
                .orElseThrow(() -> new ResourceNotFoundException("Farm", "id", farmId));

        // Chỉ chủ sở hữu mới có quyền thêm thành viên
        if (!farm.getOwner().getId().equals(currentUser.getId())) {
            throw new SecurityException("Chỉ chủ sở hữu nông trại mới có quyền thêm thành viên.");
        }

        User memberUser = userRepository.findByEmail(memberEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", memberEmail));

        if (farmMemberRepository.findByFarmIdAndUserId(farmId, memberUser.getId()).isPresent()) {
            throw new IllegalArgumentException("Người dùng này đã là thành viên.");
        }

        FarmMember newMember = FarmMember.builder()
                .farm(farm)
                .user(memberUser)
                .role(role)
                .build();

        return farmMemberRepository.save(newMember);
    }

    // ... Thêm các phương thức removeMember, getMembers, updateMemberRole sau nếu
    // cần ...

    // <<<< BỔ SUNG CÁC PHƯƠNG THỨC MỚI DƯỚI ĐÂY >>>>

    /**
     * Lấy danh sách thành viên của một nông trại.
     */
    public List<FarmMemberDTO> getMembers(Long farmId) {
        User currentUser = authenticationService.getCurrentAuthenticatedUser();
        // Kiểm tra xem người dùng hiện tại có quyền xem nông trại này không
        // (Đây là logic giả định, bạn cần triển khai checkUserAccessToFarm trong
        // FarmService)
        farmService.checkUserAccessToFarm(currentUser.getId(), farmId);

        List<FarmMember> members = farmMemberRepository.findByFarmId(farmId);

        // <<<< SỬA LẠI LOGIC MAP ĐỂ DÙNG FarmMemberDTO >>>>
        return members.stream()
                .map(member -> FarmMemberDTO.builder()
                        .userId(member.getUser().getId())
                        .fullName(member.getUser().getFullName())
                        .email(member.getUser().getEmail())
                        .role(member.getRole()) // Bây giờ kiểu dữ liệu đã khớp!
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Cập nhật vai trò của một thành viên.
     */
    @Transactional
    public FarmMember updateMemberRole(Long farmId, Long memberUserId, FarmRole newRole) {
        User currentUser = authenticationService.getCurrentAuthenticatedUser();
        Farm farm = farmRepository.findById(farmId)
                .orElseThrow(() -> new ResourceNotFoundException("Farm", "id", farmId));

        // Chỉ chủ sở hữu mới có quyền cập nhật
        if (!farm.getOwner().getId().equals(currentUser.getId())) {
            throw new SecurityException("Chỉ chủ sở hữu mới có quyền thay đổi vai trò thành viên.");
        }

        FarmMember member = farmMemberRepository.findByFarmIdAndUserId(farmId, memberUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Thành viên không tồn tại trong nông trại này."));

        member.setRole(newRole);
        return farmMemberRepository.save(member);
    }

    /**
     * Xóa một thành viên khỏi nông trại.
     */
    @Transactional
    public void removeMember(Long farmId, Long memberUserId) {
        User currentUser = authenticationService.getCurrentAuthenticatedUser();
        Farm farm = farmRepository.findById(farmId)
                .orElseThrow(() -> new ResourceNotFoundException("Farm", "id", farmId));

        // Chủ sở hữu có thể xóa bất kỳ ai, hoặc thành viên có thể tự rời đi
        boolean isOwner = farm.getOwner().getId().equals(currentUser.getId());
        boolean isSelf = currentUser.getId().equals(memberUserId);

        if (!isOwner && !isSelf) {
            throw new SecurityException("Bạn không có quyền xóa thành viên này.");
        }

        farmMemberRepository.deleteByFarmIdAndUserId(farmId, memberUserId);
    }
}