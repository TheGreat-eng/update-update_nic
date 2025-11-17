package com.example.iotserver.dto;

import com.example.iotserver.enums.FarmRole;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FarmMemberDTO {
    private Long userId;
    private String fullName;
    private String email;
    private FarmRole role; // Sử dụng đúng kiểu FarmRole
}