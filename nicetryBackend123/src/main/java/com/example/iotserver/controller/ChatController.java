package com.example.iotserver.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.iotserver.dto.response.ApiResponse;
import com.example.iotserver.entity.User;
import com.example.iotserver.service.AuthenticationService;
import com.example.iotserver.service.ChatService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@Tag(name = "12. AI Chatbot", description = "Trợ lý ảo nông nghiệp")
public class ChatController {

    private final ChatService chatService;
    private final AuthenticationService authenticationService;

    @PostMapping
    @Operation(summary = "Gửi tin nhắn tới trợ lý ảo")
    public ResponseEntity<ApiResponse<String>> chat(@RequestBody Map<String, Object> request) {
        String message = (String) request.get("message");
        Long farmId = Long.valueOf(request.get("farmId").toString());

        // Xác thực user (để đảm bảo an toàn)
        User user = authenticationService.getCurrentAuthenticatedUser();
        // TODO: Kiểm tra user có quyền với farmId này không (dùng FarmService.checkAccess)

        String response = chatService.processUserMessage(farmId, message);
        
        return ResponseEntity.ok(ApiResponse.success("Thành công", response));
    }
}