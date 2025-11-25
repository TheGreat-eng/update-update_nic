package com.example.iotserver.service;

import java.util.HashMap;
import java.util.List; // ✅ Import DTO sức khỏe
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.example.iotserver.dto.DeviceDTO;
import com.example.iotserver.dto.PlantHealthDTO;
import com.example.iotserver.dto.SensorDataDTO;
import com.example.iotserver.dto.gemini.GeminiRequest;
import com.example.iotserver.dto.gemini.GeminiResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final DeviceService deviceService;
    private final SensorDataService sensorDataService;
    private final PlantHealthService plantHealthService; // ✅ Inject thêm Service này
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper;

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String apiUrl;

    public String processUserMessage(Long farmId, String userMessage) {
        // 1. Lấy dữ liệu bối cảnh (Context)
        List<DeviceDTO> devices = deviceService.getDevicesByFarm(farmId);
        SensorDataDTO latestData = sensorDataService.getLatestSensorDataForFarmDevices(farmId);
        
        // ✅ LẤY DỮ LIỆU SỨC KHỎE CÂY TRỒNG
        PlantHealthDTO healthData = null;
        try {
            healthData = plantHealthService.getHealthStatus(farmId);
        } catch (Exception e) {
            log.warn("Không lấy được dữ liệu sức khỏe cây trồng: {}", e.getMessage());
        }

        // 2. Xây dựng System Prompt
        String prompt = buildSystemPrompt(devices, latestData, healthData, userMessage);

        // 3. Gọi Gemini API
        try {
            String url = apiUrl + "?key=" + apiKey;
            GeminiRequest request = new GeminiRequest(prompt);
            GeminiResponse response = restTemplate.postForObject(url, request, GeminiResponse.class);

            if (response == null) return "Hệ thống AI đang bận, vui lòng thử lại sau.";

            String rawText = response.getResponseText();
            log.info("Gemini Response: {}", rawText);

            // 4. Phân tích phản hồi
            return handleAIResponse(rawText);

        } catch (Exception e) {
            log.error("Chat Error: ", e);
            return "Xin lỗi, tôi đang gặp sự cố kết nối với bộ não trung tâm (Gemini API).";
        }
    }

    private String buildSystemPrompt(List<DeviceDTO> devices, SensorDataDTO sensorData, PlantHealthDTO healthData, String userMsg) {
        StringBuilder sb = new StringBuilder();
        
        sb.append("Bạn là trợ lý ảo thông minh của hệ thống SmartFarm (IoT). ");
        sb.append("Hãy trả lời ngắn gọn, hữu ích, giọng điệu thân thiện (xưng hô 'tôi' - 'bạn' hoặc 'bác').\n\n");
        
        // --- Context: Môi trường ---
        sb.append("1. DỮ LIỆU MÔI TRƯỜNG HIỆN TẠI:\n");
        if (sensorData != null) {
            sb.append("- Nhiệt độ: ").append(sensorData.getTemperature() != null ? sensorData.getTemperature() : "N/A").append("°C\n");
            sb.append("- Độ ẩm không khí: ").append(sensorData.getHumidity() != null ? sensorData.getHumidity() : "N/A").append("%\n");
            sb.append("- Độ ẩm đất: ").append(sensorData.getSoilMoisture() != null ? sensorData.getSoilMoisture() : "N/A").append("%\n");
        } else {
            sb.append("- Chưa có dữ liệu cảm biến.\n");
        }

        // --- Context: Sức khỏe cây (TĂNG ĐỘ THÔNG MINH) ---
        if (healthData != null) {
            sb.append("\n2. TÌNH TRẠNG SỨC KHỎE CÂY TRỒNG:\n");
            sb.append("- Điểm sức khỏe: ").append(healthData.getHealthScore()).append("/100\n");
            sb.append("- Đánh giá chung: ").append(healthData.getOverallSuggestion()).append("\n");
            if (!healthData.getActiveAlerts().isEmpty()) {
                sb.append("- CẢNH BÁO CẦN CHÚ Ý: ");
                healthData.getActiveAlerts().forEach(alert -> 
                    sb.append(alert.getDescription()).append("; ")
                );
                sb.append("\n");
            }
        }

        // --- Context: Thiết bị ---
        sb.append("\n3. DANH SÁCH THIẾT BỊ CÓ THỂ ĐIỀU KHIỂN:\n");
        for (DeviceDTO d : devices) {
            sb.append(String.format("- ID: %s | Tên: %s | Loại: %s | Trạng thái: %s\n", 
                d.getDeviceId(), d.getName(), d.getType(), d.getStatus()));
        }

        // --- Instruction: Function Calling ---
        sb.append("\nCHỈ THỊ XỬ LÝ:\n");
        sb.append("- Nếu người dùng hỏi thông tin: Trả lời dựa trên dữ liệu trên.\n");
        sb.append("- Nếu người dùng yêu cầu BẬT/TẮT thiết bị: Tìm thiết bị phù hợp nhất và TRẢ VỀ DUY NHẤT một JSON block (không thêm lời dẫn) như sau:\n");
        sb.append("```json\n{\"action\": \"CONTROL\", \"deviceId\": \"CHÍNH_XÁC_ID_CỦA_THIẾT_BỊ\", \"command\": \"turn_on\" (hoặc turn_off), \"duration\": số_giây_nếu_có, \"reply\": \"Câu trả lời xác nhận cho user\"}\n```\n");
        
        sb.append("\nUser nói: \"").append(userMsg).append("\"");
        
        return sb.toString();
    }

    private String handleAIResponse(String rawText) {
        Pattern pattern = Pattern.compile("```json\\s*(\\{.*?\\})\\s*```", Pattern.DOTALL);
        Matcher matcher = pattern.matcher(rawText);

        if (matcher.find()) {
            try {
                String jsonStr = matcher.group(1);
                JsonNode json = objectMapper.readTree(jsonStr);

                if (json.has("action") && "CONTROL".equals(json.get("action").asText())) {
                    String deviceId = json.get("deviceId").asText();
                    String command = json.get("command").asText();
                    int duration = json.has("duration") ? json.get("duration").asInt() : 0;
                    String reply = json.get("reply").asText();

                    // ✅ XỬ LÝ LỖI (TRY-CATCH)
                    try {
                        Map<String, Object> params = new HashMap<>();
                        if (duration > 0) params.put("duration", duration);
                        
                        deviceService.internalControlDevice(deviceId, command, params);
                        return reply + " ✅";
                        
                    } catch (Exception e) {
                        log.error("Lỗi điều khiển thiết bị từ Chatbot: {}", e.getMessage());
                        // Trả về thông báo lỗi thân thiện thay vì lỗi kỹ thuật
                        return "Tôi đã cố gắng thực hiện lệnh nhưng không tìm thấy thiết bị **" + deviceId + "** hoặc thiết bị đang ngoại tuyến. Vui lòng kiểm tra lại!";
                    }
                }
            } catch (Exception e) {
                log.error("Lỗi parse JSON từ AI: {}", e.getMessage());
                return "Xin lỗi, tôi bị rối một chút khi xử lý yêu cầu này.";
            }
        }
        return rawText;
    }
}