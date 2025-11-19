package com.example.iotserver.config;

import com.example.iotserver.security.JwtUtil;
import com.example.iotserver.security.CustomUserDetailsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.messaging.MessagingException; // 👈 Quan trọng: Import Exception để chặn kết nối

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
@Slf4j
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService userDetailsService;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                // Kiểm tra cả lệnh CONNECT và STOMP (một số client dùng STOMP thay vì CONNECT)
                if (StompCommand.CONNECT.equals(accessor.getCommand()) || 
                    StompCommand.STOMP.equals(accessor.getCommand())) {

                    String authorizationHeader = accessor.getFirstNativeHeader("Authorization");
                    log.info("🔒 [WS Security] Kiểm tra kết nối mới...");

                    boolean isAuthenticated = false;

                    if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
                        String token = authorizationHeader.substring(7);
                        try {
                            String email = jwtUtil.extractEmail(token);
                            if (email != null) {
                                UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                                if (jwtUtil.validateToken(token, userDetails.getUsername())) {
                                    UsernamePasswordAuthenticationToken authentication =
                                            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                                    accessor.setUser(authentication);
                                    SecurityContextHolder.getContext().setAuthentication(authentication);
                                    
                                    isAuthenticated = true;
                                    log.info("✅ [WS Security] Xác thực thành công cho user: {}", email);
                                }
                            }
                        } catch (Exception e) {
                            log.error("❌ [WS Security] Token lỗi: {}", e.getMessage());
                        }
                    } else {
                        log.warn("⚠️ [WS Security] Không tìm thấy Header Authorization");
                    }

                    // ⛔ QUAN TRỌNG NHẤT: NẾU KHÔNG HỢP LỆ -> NÉM RA EXCEPTION ĐỂ CHẶN NGAY
                    if (!isAuthenticated) {
                        log.error("⛔ [WS Security] TỪ CHỐI KẾT NỐI: Token không hợp lệ hoặc thiếu!");
                        throw new MessagingException("Access Denied: Invalid or missing Token");
                    }
                }
                
                return message;
            }
        });
    }
}