// File: src/main/java/com/example/iotserver/service/AIService.java

package com.example.iotserver.service;

import com.example.iotserver.dto.AIPredictionResponse;
import com.example.iotserver.dto.SensorDataDTO;
import com.example.iotserver.entity.Farm;
import com.example.iotserver.exception.ResourceNotFoundException;
import com.example.iotserver.repository.FarmRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class AIService {

    private final FarmRepository farmRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final SensorDataService sensorDataService;
    private final WeatherService weatherService; // <<< THÊM VÀO

    @Value("${ai.service.url}")
    private String aiServiceUrl;

    // <<< THAY THẾ TOÀN BỘ PHƯƠNG THỨC getPredictions() BẰNG PHIÊN BẢN NÀY >>>
    public AIPredictionResponse getPredictions(Long farmId) {
        try {
            // === Bước 1: Lấy thông tin nông trại và tọa độ ===
            Farm farm = farmRepository.findById(farmId)
                    .orElseThrow(() -> new ResourceNotFoundException("Farm", "id", farmId));

            Map<String, Double> coordinates = weatherService.getCoordinatesFromLocation(farm.getLocation());
            double latitude = coordinates.get("latitude");
            double longitude = coordinates.get("longitude");

            // === Bước 2: Lấy dữ liệu cảm biến hiện tại ===
            SensorDataDTO currentData = sensorDataService.getLatestSensorDataForFarmDevices(farmId);
            if (currentData == null) {
                log.warn("Không có dữ liệu cảm biến cho farm {} để gửi tới AI.", farmId);
                return null;
            }

            // === Bước 3: Lấy tất cả dữ liệu lịch sử cần thiết ===
            Instant now = Instant.now();
            Instant t10MinsAgo = now.minus(10, ChronoUnit.MINUTES);
            Instant t30MinsAgo = now.minus(30, ChronoUnit.MINUTES);
            Instant t60MinsAgo = now.minus(60, ChronoUnit.MINUTES);

            // Lấy các giá trị tại các mốc thời gian (lag)
            Double soilMoistureLag10 = sensorDataService.getLatestValueBefore(farmId, "soil_moisture", t10MinsAgo);
            Double soilMoistureLag30 = sensorDataService.getLatestValueBefore(farmId, "soil_moisture", t30MinsAgo);
            Double soilMoistureLag60 = sensorDataService.getLatestValueBefore(farmId, "soil_moisture", t60MinsAgo);

            // <<< BỔ SUNG CÁC DÒNG CÒN THIẾU Ở ĐÂY >>>
            Double temperatureLag10 = sensorDataService.getLatestValueBefore(farmId, "temperature", t10MinsAgo);
            Double temperatureLag30 = sensorDataService.getLatestValueBefore(farmId, "temperature", t30MinsAgo);
            Double temperatureLag60 = sensorDataService.getLatestValueBefore(farmId, "temperature", t60MinsAgo);
            // <<< KẾT THÚC BỔ SUNG >>>

            // Lấy các giá trị trung bình lăn (rolling mean)
            Double soilMoistureRollingMean = sensorDataService.getAverageValueInRange(farmId, "soil_moisture",
                    t60MinsAgo, now);
            Double temperatureRollingMean = sensorDataService.getAverageValueInRange(farmId, "temperature", t60MinsAgo,
                    now);
            Double lightIntensityRollingMean = sensorDataService.getAverageValueInRange(farmId, "light_intensity",
                    t60MinsAgo, now);

            // === Bước 4: Xây dựng request body hoàn chỉnh ===
            Map<String, Object> requestBody = new HashMap<>();

            // 4.1 Dữ liệu vị trí
            requestBody.put("location_data", Map.of("latitude", latitude, "longitude", longitude));

            // 4.2 Dữ liệu hiện tại
            requestBody.put("current_data", Map.of(
                    "temperature", Optional.ofNullable(currentData.getTemperature()).orElse(0.0),
                    "humidity", Optional.ofNullable(currentData.getHumidity()).orElse(0.0),
                    "lightIntensity", Optional.ofNullable(currentData.getLightIntensity()).orElse(0.0)));

            // 4.3 Dữ liệu lịch sử (đầy đủ và chính xác)
            Map<String, Object> historicalDataMap = new HashMap<>();
            // Fallback: Nếu không có dữ liệu lịch sử, tạm dùng dữ liệu hiện tại
            historicalDataMap.put("soilMoisture_now", Optional.ofNullable(currentData.getSoilMoisture()).orElse(0.0));
            historicalDataMap.put("soilMoisture_lag_10",
                    Optional.ofNullable(soilMoistureLag10).orElse(currentData.getSoilMoisture()));
            historicalDataMap.put("soilMoisture_lag_30",
                    Optional.ofNullable(soilMoistureLag30).orElse(currentData.getSoilMoisture()));
            historicalDataMap.put("soilMoisture_lag_60",
                    Optional.ofNullable(soilMoistureLag60).orElse(currentData.getSoilMoisture()));

            // <<< BỔ SUNG CÁC DÒNG CÒN THIẾU Ở ĐÂY >>>
            historicalDataMap.put("temperature_lag_10",
                    Optional.ofNullable(temperatureLag10).orElse(currentData.getTemperature()));
            historicalDataMap.put("temperature_lag_30",
                    Optional.ofNullable(temperatureLag30).orElse(currentData.getTemperature()));
            historicalDataMap.put("temperature_lag_60",
                    Optional.ofNullable(temperatureLag60).orElse(currentData.getTemperature()));
            // <<< KẾT THÚC BỔ SUNG >>>

            historicalDataMap.put("soilMoisture_rolling_mean_60m",
                    Optional.ofNullable(soilMoistureRollingMean).orElse(currentData.getSoilMoisture()));
            historicalDataMap.put("temperature_rolling_mean_60m",
                    Optional.ofNullable(temperatureRollingMean).orElse(currentData.getTemperature()));
            historicalDataMap.put("lightIntensity_rolling_mean_60m",
                    Optional.ofNullable(lightIntensityRollingMean).orElse(currentData.getLightIntensity()));
            requestBody.put("historical_data", historicalDataMap);

            // === Bước 5: Gọi AI Service ===
            String predictionUrl = aiServiceUrl + "/predict/soil_moisture";
            log.info("Đang gửi request đầy đủ tới AI Service: {}", predictionUrl);
            log.debug("Request body: {}", requestBody);

            AIPredictionResponse response = restTemplate.postForObject(
                    predictionUrl, requestBody, AIPredictionResponse.class);

            log.info("✅ Nhận được phản hồi từ AI Service");
            return response;

        } catch (Exception e) {
            log.error("❌ Lỗi khi gọi AI Service", e); // Sửa log để in ra cả stack trace
            return null;
        }
    }

    public Map<String, Object> diagnosePlantDisease(MultipartFile imageFile) {
        try {
            // String diagnoseUrl = aiServiceUrl.replace("/predict", "/diagnose");

            String diagnoseUrl = aiServiceUrl + "/diagnose";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("image", new ByteArrayResource(imageFile.getBytes()) {
                @Override
                public String getFilename() {
                    return imageFile.getOriginalFilename();
                }
            });

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            log.info("Đang gửi ảnh tới AI Service để chẩn đoán: {}", diagnoseUrl);
            Map<String, Object> response = restTemplate.postForObject(diagnoseUrl, requestEntity, Map.class);
            log.info("✅ Nhận được kết quả chẩn đoán từ AI Service");
            return response;

        } catch (IOException e) {
            log.error("❌ Lỗi đọc file ảnh: {}", e.getMessage());
            return Map.of("error", "Lỗi đọc file ảnh");
        } catch (Exception e) {
            log.error("❌ Lỗi khi gọi AI Service chẩn đoán: {}", e.getMessage());
            return Map.of("error", "Lỗi dịch vụ AI không khả dụng");
        }
    }
}