package com.example.iotserver.service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.example.iotserver.config.InfluxDBConfig;
import com.example.iotserver.dto.SensorDataDTO;
import com.example.iotserver.entity.Device;
import com.example.iotserver.repository.DeviceRepository;
import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.QueryApi;
import com.influxdb.client.WriteApiBlocking;
import com.influxdb.client.domain.WritePrecision;
import com.influxdb.client.write.Point;
import com.influxdb.query.FluxRecord;
import com.influxdb.query.FluxTable;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j; // Thêm import này

@Service
@Slf4j
@RequiredArgsConstructor
public class SensorDataService {

    private final WriteApiBlocking writeApi;
    private final InfluxDBClient influxDBClient;
    private final InfluxDBConfig influxDBConfig;
    private final DeviceRepository deviceRepository; // Inject DeviceRepository

    /**
     * Save sensor data to InfluxDB
     */
    public void saveSensorData(SensorDataDTO data) {
        try {
            Point point = Point.measurement("sensor_data")
                    .addTag("device_id", data.getDeviceId())
                    .addTag("sensor_type", data.getSensorType() != null ? data.getSensorType() : "UNKNOWN") // Thêm kiểm
                                                                                                            // tra null
                    .addTag("farm_id", String.valueOf(data.getFarmId()))
                    .time(data.getTimestamp(), WritePrecision.MS);

            // VVVV--- THÊM LOG DEBUG CHI TIẾT ---VVVV
            log.info(">>>> [INFLUX WRITE] Preparing to write Point for device {}", data.getDeviceId());
            // ^^^^-------------------------------^^^^

            // VVVV--- THÊM ĐẦY ĐỦ CÁC TRƯỜNG ---VVVV
            if (data.getTemperature() != null)
                point.addField("temperature", data.getTemperature());
            if (data.getHumidity() != null)
                point.addField("humidity", data.getHumidity());
            if (data.getSoilMoisture() != null)
                point.addField("soil_moisture", data.getSoilMoisture());
            if (data.getLightIntensity() != null)
                point.addField("light_intensity", data.getLightIntensity());
            if (data.getSoilPH() != null)
                point.addField("soilPH", data.getSoilPH());
            // ^^^^-----------------------------^^^^

            // Nếu không có field nào được thêm, không ghi để tránh lỗi
            if (point.hasFields()) {
                writeApi.writePoint(point);
                log.debug("Saved sensor data for device: {}", data.getDeviceId());
            } else {
                log.warn("No fields to write for device {}, skipping InfluxDB write.", data.getDeviceId());
            }

        } catch (Exception e) {
            log.error("Error saving sensor data to InfluxDB: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to save sensor data", e);
        }
    }

    // File: SensorDataService.java

    /**
     * Get latest sensor data for a device by pivoting fields into a single record.
     *  SỬA: Tăng range lên 24h để đảm bảo có dữ liệu
     */
    public SensorDataDTO getLatestSensorData(String deviceId) {
        try {
            log.info(" [InfluxDB] Getting latest data for device: {}", deviceId);

            //  SỬA ĐỔI QUERY: Thêm pivot() để gộp các fields lại thành một hàng duy nhất
            String query = String.format(
                    "from(bucket: \"%s\")\n" +
                            "  |> range(start: -30d)\n" +
                            "  |> filter(fn: (r) => r._measurement == \"sensor_data\" and r.device_id == \"%s\")\n" + // <--
                                                                                                                      // GỘP
                                                                                                                      // LẠI
                                                                                                                      // BẰNG
                                                                                                                      // "and"
                            "  |> last()\n" +
                            "  |> pivot(rowKey:[\"_time\"], columnKey: [\"_field\"], valueColumn: \"_value\")",
                    influxDBConfig.getBucket(), deviceId);

            log.debug(" [InfluxDB] Executing Pivot Query: {}", query);

            QueryApi queryApi = influxDBClient.getQueryApi();
            List<FluxTable> tables = queryApi.query(query, influxDBConfig.getOrg());

            if (tables.isEmpty() || tables.get(0).getRecords().isEmpty()) {
                log.warn(" [InfluxDB] No data found for device: {} in the last hour.", deviceId);
                return null;
            }

            // Với pivot(), chúng ta chỉ cần xử lý record đầu tiên
            FluxRecord record = tables.get(0).getRecords().get(0);
            Map<String, Object> values = record.getValues();

            SensorDataDTO sensorData = SensorDataDTO.builder()
                    .deviceId(deviceId)
                    .timestamp(record.getTime())
                    .temperature(getDoubleValue(values, "temperature"))
                    .humidity(getDoubleValue(values, "humidity"))
                    .soilMoisture(getDoubleValue(values, "soil_moisture"))
                    .lightIntensity(getDoubleValue(values, "light_intensity"))
                    .soilPH(getDoubleValue(values, "soilPH"))
                    .build();

            log.info(" [InfluxDB] Successfully retrieved latest data for {}: {}", deviceId, sensorData);
            return sensorData;

        } catch (Exception e) {
            log.error(" [InfluxDB] Error querying latest sensor data for {}: {}", deviceId, e.getMessage(), e);
            return null; // Trả về null khi có lỗi
        }
    }

    //  THÊM HELPER METHOD NÀY: Lấy giá trị Double từ map một cách an toàn
    private Double getDoubleValue(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        return null;
    }

    /**
     * Get sensor data for a time range
     */
    public List<SensorDataDTO> getSensorDataRange(
            String deviceId,
            Instant start,
            Instant end) {
        String flux = String.format(
                "from(bucket: \"%s\") " +
                        "|> range(start: %s, stop: %s) " +
                        "|> filter(fn: (r) => r[\"device_id\"] == \"%s\") " +
                        "|> sort(columns: [\"_time\"])",
                influxDBConfig.getBucket(),
                start.toString(),
                end.toString(),
                deviceId);

        List<Map<String, Object>> rawDataList = executeQueryList(flux);
        return rawDataList.stream()
                .map(SensorDataDTO::fromInfluxRecord)
                .collect(Collectors.toList());
    }

    /**
     * Get aggregated sensor data (for charts)
     */
    public List<SensorDataDTO> getAggregatedData(
            String deviceId,
            String field,
            String aggregation, // mean, max, min
            String window // 1m, 5m, 1h, 1d
    ) {
        String flux = String.format(
                "from(bucket: \"%s\") " +
                        "|> range(start: -7d) " +
                        "|> filter(fn: (r) => r[\"device_id\"] == \"%s\") " +
                        "|> filter(fn: (r) => r[\"_field\"] == \"%s\") " +
                        "|> aggregateWindow(every: %s, fn: %s, createEmpty: false)",
                influxDBConfig.getBucket(),
                deviceId,
                field,
                window,
                aggregation);

        List<Map<String, Object>> rawDataList = executeQueryList(flux);

        //  THÊM: Log debug
        log.info(" [Aggregated Query] Device: {}, Field: {}, Window: {}, Results: {}",
                deviceId, field, window, rawDataList.size());

        if (rawDataList.isEmpty()) {
            log.warn(" Không có dữ liệu aggregated cho device: {}, field: {}", deviceId, field);
            return Collections.emptyList(); //  Trả về list rỗng thay vì lỗi
        }

        return rawDataList.stream()
                .map(data -> {
                    SensorDataDTO dto = SensorDataDTO.fromInfluxRecord(data);

                    //  SỬA: Xử lý null
                    Object valueObj = data.get("_value");
                    if (valueObj != null) {
                        if (valueObj instanceof Number) {
                            dto.setAvgValue(((Number) valueObj).doubleValue());
                        } else {
                            log.warn(" Value không phải số: {}", valueObj);
                        }
                    }

                    return dto;
                })
                .filter(dto -> dto.getAvgValue() != null) //  Lọc bỏ các record null
                .collect(Collectors.toList());
    }

    /**
     * Get all devices data for a farm
     */
    public Map<String, Map<String, Object>> getFarmLatestData(Long farmId) {
        String flux = String.format(
                "from(bucket: \"%s\") " +
                        "|> range(start: -1h) " +
                        "|> filter(fn: (r) => r[\"farm_id\"] == \"%s\") " +
                        "|> last()",
                influxDBConfig.getBucket(),
                farmId);

        List<Map<String, Object>> results = executeQueryList(flux);
        Map<String, Map<String, Object>> deviceDataMap = new HashMap<>();

        for (Map<String, Object> record : results) {
            String deviceId = (String) record.get("device_id");
            deviceDataMap.putIfAbsent(deviceId, new HashMap<>());

            String field = record.get("_field").toString();
            Object value = record.get("_value");

            deviceDataMap.get(deviceId).put(field, value);
            deviceDataMap.get(deviceId).put("device_id", deviceId);
            deviceDataMap.get(deviceId).put("timestamp", record.get("_time"));
        }

        return deviceDataMap;
    }

    // Helper methods
    private Map<String, Object> executeQuery(String flux) {
        QueryApi queryApi = influxDBClient.getQueryApi();
        List<FluxTable> tables = queryApi.query(flux, influxDBConfig.getOrg());

        if (tables.isEmpty() || tables.get(0).getRecords().isEmpty()) {
            return new HashMap<>();
        }

        return fluxRecordToMap(tables.get(0).getRecords().get(0));
    }

    private List<Map<String, Object>> executeQueryList(String flux) {
        try {
            QueryApi queryApi = influxDBClient.getQueryApi();
            List<FluxTable> tables = queryApi.query(flux, influxDBConfig.getOrg());

            //  THÊM: Log debug
            log.debug(" [InfluxDB] Query executed, tables count: {}", tables.size());

            if (tables.isEmpty()) {
                return Collections.emptyList(); //  Trả về list rỗng
            }

            List<Map<String, Object>> results = new ArrayList<>();
            for (FluxTable table : tables) {
                for (FluxRecord record : table.getRecords()) {
                    Map<String, Object> data = new HashMap<>();

                    //  SỬA: Xử lý null an toàn
                    Object value = record.getValue();
                    if (value != null) {
                        data.put("_value", value);
                    } else {
                        log.warn(" Record có value null, bỏ qua");
                        continue; // Skip record này
                    }

                    data.put("_time", record.getTime());
                    data.put("_field", record.getField());
                    data.put("device_id", record.getValueByKey("device_id"));

                    results.add(data);
                }
            }

            return results;

        } catch (Exception e) {
            log.error(" [InfluxDB] Lỗi query: {}", e.getMessage(), e);
            return Collections.emptyList(); //  Trả về list rỗng thay vì throw exception
        }
    }

    private Map<String, Object> fluxRecordToMap(FluxRecord record) {
        Map<String, Object> map = new HashMap<>();
        map.put("_time", record.getTime());
        map.put("_value", record.getValue());
        map.put("_field", record.getField());
        map.putAll(record.getValues());
        return map;
    }

    /**
     * Lấy dữ liệu cảm biến mới nhất theo farmId
     */
    public SensorDataDTO getLatestSensorDataByFarmId(Long farmId) {
        try {
            String query = String.format(
                    "from(bucket: \"%s\") " +
                            "|> range(start: -30d) " +
                            "|> filter(fn: (r) => r._measurement == \"sensor_data\" and r.farm_id == \"%s\") ", // Giữ
                                                                                                                // nguyên
                                                                                                                // %s
                    influxDBConfig.getBucket(),
                    String.valueOf(farmId));

            log.debug(" [InfluxDB] Query for latest farm data {}: {}", farmId, query);

            QueryApi queryApi = influxDBClient.getQueryApi();
            List<FluxTable> tables = queryApi.query(query);

            if (tables == null || tables.isEmpty()) {
                log.warn(" [InfluxDB] Không có dữ liệu cho farmId: {}", farmId);
                return null;
            }

            // Parse dữ liệu
            SensorDataDTO data = new SensorDataDTO();
            data.setFarmId(farmId);
            data.setTimestamp(Instant.now());

            for (FluxTable table : tables) {
                for (FluxRecord record : table.getRecords()) {
                    String field = (String) record.getField();
                    Object value = record.getValue();

                    switch (field) {
                        case "temperature":
                            data.setTemperature(((Number) value).doubleValue());
                            break;
                        case "humidity":
                            data.setHumidity(((Number) value).doubleValue());
                            break;
                        case "soil_moisture":
                            data.setSoilMoisture(((Number) value).doubleValue());
                            break;
                        case "light_intensity":
                            data.setLightIntensity(((Number) value).doubleValue());
                            break;
                        case "soilPH":
                            data.setSoilPH(((Number) value).doubleValue());
                            break;
                    }
                }
            }

            log.info(" [InfluxDB] Lấy dữ liệu thành công cho farmId: {}", farmId);
            return data;

        } catch (Exception e) {
            log.error(" [InfluxDB] Lỗi khi lấy dữ liệu farmId {}: {}", farmId, e.getMessage());
            return null;
        }
    }

    /**
     * Lấy dữ liệu cảm biến tại thời điểm cụ thể
     * (Dùng cho quy tắc 5: độ ẩm dao động)
     */
    public SensorDataDTO getSensorDataAt(Long farmId, LocalDateTime dateTime) {
        try {
            String query = String.format(
                    "from(bucket: \"%s\") " +
                            "|> range(start: %s, stop: %s) " +
                            "|> filter(fn: (r) => r[\"_measurement\"] == \"sensor_data\") " +
                            "|> filter(fn: (r) => r[\"farm_id\"] == \"%s\") " +
                            "|> last()",
                    influxDBConfig.getBucket(),
                    dateTime.minusMinutes(30).toString() + "Z",
                    dateTime.plusMinutes(30).toString() + "Z",
                    farmId);

            log.debug(" [InfluxDB] Query for farmId {}: {}", farmId, query);

            QueryApi queryApi = influxDBClient.getQueryApi();
            List<FluxTable> tables = queryApi.query(query);

            if (tables == null || tables.isEmpty()) {
                log.warn(" [InfluxDB] Không có dữ liệu cho farmId: {}", farmId);
                return null;
            }

            // Parse dữ liệu
            SensorDataDTO data = new SensorDataDTO();
            data.setFarmId(farmId);
            data.setTimestamp(Instant.now());

            for (FluxTable table : tables) {
                for (FluxRecord record : table.getRecords()) {
                    String field = (String) record.getField();
                    Object value = record.getValue();

                    switch (field) {
                        case "temperature":
                            data.setTemperature(((Number) value).doubleValue());
                            break;
                        case "humidity":
                            data.setHumidity(((Number) value).doubleValue());
                            break;
                        case "soil_moisture":
                            data.setSoilMoisture(((Number) value).doubleValue());
                            break;
                        case "light_intensity":
                            data.setLightIntensity(((Number) value).doubleValue());
                            break;
                        case "soilPh":
                            data.setSoilPH(((Number) value).doubleValue());
                            break;
                    }
                }
            }

            log.info(" [InfluxDB] Lấy dữ liệu thành công cho farmId: {}", farmId);
            return data;

        } catch (Exception e) {
            log.error(" [InfluxDB] Lỗi khi lấy dữ liệu farmId {}: {}", farmId, e.getMessage());
            return null;
        }
    }

    /**
     *  DEBUG: Kiểm tra dữ liệu sensor có tồn tại không
     */
    public boolean hasRecentData(String deviceId, int hoursBack) {
        try {
            String query = String.format(
                    "from(bucket: \"%s\")\n" +
                            "  |> range(start: -%dh)\n" +
                            "  |> filter(fn: (r) => r[\"_measurement\"] == \"sensor_data\")\n" +
                            "  |> filter(fn: (r) => r[\"device_id\"] == \"%s\")\n" +
                            "  |> count()",
                    influxDBConfig.getBucket(), hoursBack, deviceId);

            QueryApi queryApi = influxDBClient.getQueryApi();
            List<FluxTable> tables = queryApi.query(query, influxDBConfig.getOrg());

            if (!tables.isEmpty() && !tables.get(0).getRecords().isEmpty()) {
                Object count = tables.get(0).getRecords().get(0).getValue();
                long recordCount = count != null ? ((Number) count).longValue() : 0;
                log.info(" Device {} có {} bản ghi trong {}h qua", deviceId, recordCount, hoursBack);
                return recordCount > 0;
            }

            log.warn(" Không có dữ liệu nào cho device {} trong {}h qua", deviceId, hoursBack);
            return false;

        } catch (Exception e) {
            log.error(" Lỗi kiểm tra dữ liệu: {}", e.getMessage());
            return false;
        }
    }

    // VVVV--- THÊM PHƯƠNG THỨC DEBUG NÀY VÀO CUỐI CLASS ---VVVV
    public List<Map<String, Object>> getRawInfluxDataForDebug() {
        String query = String.format(
                "from(bucket: \"%s\")\n" +
                        "  |> range(start: -30d)\n" +
                        "  |> filter(fn: (r) => r._measurement == \"sensor_data\")\n" +
                        "  |> limit(n: 10)\n" +
                        "  |> sort(columns: [\"_time\"], desc: true)",
                influxDBConfig.getBucket());

        log.info(">>>> [DEBUG_INFLUX] Executing raw query: {}", query);

        try {
            QueryApi queryApi = influxDBClient.getQueryApi();
            List<FluxTable> tables = queryApi.query(query);

            List<Map<String, Object>> results = new ArrayList<>();
            for (FluxTable table : tables) {
                for (FluxRecord record : table.getRecords()) {
                    results.add(record.getValues());
                }
            }
            log.info(">>>> [DEBUG_INFLUX] Found {} raw records.", results.size());
            return results;
        } catch (Exception e) {
            log.error(">>>> [DEBUG_INFLUX] Error executing raw query", e);
            return List.of(Map.of("error", e.getMessage()));
        }
    }
    // ^^^^-----------------------------------------------------^^^^

    // VVVV--- THÊM HÀM MỚI NÀY ---VVVV
    public SensorDataDTO getLatestSensorDataForFarmDevices(Long farmId) {
        // 1. Lấy danh sách deviceId từ MySQL (giữ nguyên)
        List<String> deviceIds = deviceRepository.findByFarmId(farmId)
                .stream()
                .map(Device::getDeviceId)
                .collect(Collectors.toList());

        if (deviceIds.isEmpty()) {
            log.warn("Farm {} không có thiết bị nào.", farmId);
            return null;
        }

        String deviceIdFilter = deviceIds.stream()
                .map(id -> String.format("r.device_id == \"%s\"", id))
                .collect(Collectors.joining(" or "));

        // 2. Câu query Flux (giữ nguyên, nó đã đúng)
        String query = String.format(
                "from(bucket: \"%s\") " +
                        "|> range(start: -30d) " +
                        "|> filter(fn: (r) => r._measurement == \"sensor_data\" and (%s)) " +
                        "|> last()", // Bỏ pivot đi để xử lý thô cho chắc chắn
                influxDBConfig.getBucket(),
                deviceIdFilter);

        log.debug(" [InfluxDB] Query for latest farm devices data: {}", query);

        try {
            QueryApi queryApi = influxDBClient.getQueryApi();
            List<FluxTable> tables = queryApi.query(query);

            if (tables.isEmpty()) {
                log.warn(" [InfluxDB] Query không trả về bảng nào cho các thiết bị của farm: {}", farmId);
                return null;
            }

            // 3. Logic xử lý kết quả MỚI và AN TOÀN
            var dtoBuilder = SensorDataDTO.builder();
            boolean hasData = false;

            // Duyệt qua tất cả các bảng (mỗi bảng cho một _field)
            for (FluxTable table : tables) {
                // Duyệt qua tất cả các record trong bảng
                for (FluxRecord record : table.getRecords()) {
                    hasData = true; // Đánh dấu là đã tìm thấy dữ liệu

                    // Lấy các thông tin chung từ record đầu tiên tìm thấy
                    if (dtoBuilder.build().getDeviceId() == null) {
                        dtoBuilder.deviceId((String) record.getValueByKey("device_id"));
                        dtoBuilder.timestamp(record.getTime());
                    }

                    String field = record.getField();
                    Object value = record.getValue();

                    if (field != null && value instanceof Number) {
                        switch (field) {
                            case "temperature" -> dtoBuilder.temperature(((Number) value).doubleValue());
                            case "humidity" -> dtoBuilder.humidity(((Number) value).doubleValue());
                            case "soil_moisture" -> dtoBuilder.soilMoisture(((Number) value).doubleValue());
                            case "light_intensity" -> dtoBuilder.lightIntensity(((Number) value).doubleValue());
                            case "soilPH" -> dtoBuilder.soilPH(((Number) value).doubleValue());
                        }
                    }
                }
            }

            if (!hasData) {
                log.warn(" [InfluxDB] Query trả về bảng nhưng không có record nào cho farm: {}", farmId);
                return null;
            }

            SensorDataDTO finalDto = dtoBuilder.build();
            log.info(" [InfluxDB] Đã xử lý thành công dữ liệu thô thành DTO: {}", finalDto);
            return finalDto;

        } catch (Exception e) {
            log.error(" [InfluxDB] Lỗi nghiêm trọng khi xử lý kết quả query cho farm {}: {}", farmId, e.getMessage(),
                    e);
            return null;
        }
    }

    // VVVV--- THÊM PHƯƠNG THỨC MỚI NÀY ---VVVV
    /**
     * Lấy dữ liệu chuỗi thời gian cho nhiều thiết bị và nhiều trường dữ liệu.
     * 
     * @param deviceIds Danh sách các device_id cần truy vấn.
     * @param fields    Danh sách các _field cần truy vấn (temperature, humidity,
     *                  ...).
     * @param start     Thời gian bắt đầu.
     * @param end       Thời gian kết thúc.
     * @param window    Khoảng thời gian tổng hợp (vd: "10m", "1h").
     * @return Một Map với key là "deviceId_field" và value là danh sách các điểm dữ
     *         liệu.
     */
    public Map<String, List<SensorDataDTO>> getMultiSeriesData(List<String> deviceIds, List<String> fields,
            Instant start, Instant end, String window) {
        if (deviceIds == null || deviceIds.isEmpty() || fields == null || fields.isEmpty()) {
            return Collections.emptyMap();
        }

        // Tạo các chuỗi filter cho Flux query
        String deviceIdFilter = deviceIds.stream()
                .map(id -> String.format("r.device_id == \"%s\"", id))
                .collect(Collectors.joining(" or "));

        String fieldFilter = fields.stream()
                .map(field -> String.format("r._field == \"%s\"", field))
                .collect(Collectors.joining(" or "));

        String query = String.format(
                "from(bucket: \"%s\")\n" +
                        "  |> range(start: %s, stop: %s)\n" +
                        "  |> filter(fn: (r) => r._measurement == \"sensor_data\")\n" +
                        "  |> filter(fn: (r) => %s)\n" + // Filter theo device_id
                        "  |> filter(fn: (r) => %s)\n" + // Filter theo _field
                        "  |> aggregateWindow(every: %s, fn: mean, createEmpty: false)\n" +
                        "  |> yield(name: \"mean\")",
                influxDBConfig.getBucket(),
                start.toString(),
                end.toString(),
                deviceIdFilter,
                fieldFilter,
                window);

        log.info("Executing multi-series query for {} devices and {} fields.", deviceIds.size(), fields.size());

        QueryApi queryApi = influxDBClient.getQueryApi();
        List<FluxTable> tables = queryApi.query(query, influxDBConfig.getOrg());

        // Nhóm kết quả lại theo "deviceId_field"
        Map<String, List<SensorDataDTO>> result = new HashMap<>();
        for (FluxTable table : tables) {
            for (FluxRecord record : table.getRecords()) {
                String deviceId = (String) record.getValueByKey("device_id");
                String field = record.getField();
                String key = deviceId + "_" + field;

                result.putIfAbsent(key, new ArrayList<>());

                SensorDataDTO dto = SensorDataDTO.builder()
                        .timestamp(record.getTime())
                        .avgValue(
                                record.getValue() instanceof Number ? ((Number) record.getValue()).doubleValue() : null)
                        .build();

                result.get(key).add(dto);
            }
        }
        return result;
    }
    // ^^^^---------------------------------------------------^^^^

    // <<< DÁN 2 PHƯƠ-NG THỨC MỚI NÀY VÀO CUỐI FILE SensorDataService.java >>>

    /**
     * Lấy giá trị trung bình của một trường dữ liệu trong một khoảng thời gian.
     */
    public Double getAverageValueInRange(Long farmId, Long zoneId, String field, Instant start, Instant end) {
        List<String> deviceIds = getDeviceIdsByFarmAndZone(farmId, zoneId);
        if (deviceIds.isEmpty()) return null;

        String deviceFilter = deviceIds.stream()
                .map(id -> String.format("r.device_id == \"%s\"", id))
                .collect(Collectors.joining(" or "));

        String query = String.format(
                "from(bucket: \"%s\")\n" +
                        "  |> range(start: %s, stop: %s)\n" +
                        "  |> filter(fn: (r) => r._measurement == \"sensor_data\")\n" +
                        "  |> filter(fn: (r) => r._field == \"%s\")\n" +
                        "  |> filter(fn: (r) => %s)\n" +
                        "  |> mean()",
                influxDBConfig.getBucket(), start.toString(), end.toString(), field, deviceFilter);

        List<FluxTable> tables = influxDBClient.getQueryApi().query(query);
        if (!tables.isEmpty() && !tables.get(0).getRecords().isEmpty()) {
            Object value = tables.get(0).getRecords().get(0).getValue();
            return value instanceof Number ? ((Number) value).doubleValue() : null;
        }
        return null;
    }

    /**
     * Lấy giá trị gần nhất trước một thời điểm cụ thể.
     */
    public Double getLatestValueBefore(Long farmId, Long zoneId, String field, Instant time) {
         List<String> deviceIds = getDeviceIdsByFarmAndZone(farmId, zoneId);
         if (deviceIds.isEmpty()) return null;
         
         String deviceFilter = deviceIds.stream()
                .map(id -> String.format("r.device_id == \"%s\"", id))
                .collect(Collectors.joining(" or "));

         // ... query giống hàm cũ nhưng thay deviceIdFilter bằng deviceFilter mới ...
         // ...
         String query = String.format(
                "from(bucket: \"%s\")\n" +
                        "  |> range(start: -30d, stop: %s)\n" + 
                        "  |> filter(fn: (r) => r._measurement == \"sensor_data\")\n" +
                        "  |> filter(fn: (r) => r._field == \"%s\")\n" +
                        "  |> filter(fn: (r) => %s)\n" +
                        "  |> last()",
                influxDBConfig.getBucket(), time.toString(), field, deviceFilter);

        List<FluxTable> tables = influxDBClient.getQueryApi().query(query);
        if (!tables.isEmpty() && !tables.get(0).getRecords().isEmpty()) {
            Object value = tables.get(0).getRecords().get(0).getValue();
            return value instanceof Number ? ((Number) value).doubleValue() : null;
        }
        return null;
    }


    // Lấy danh sách deviceId thuộc zone cụ thể để lọc trong InfluxDB
    public List<String> getDeviceIdsByFarmAndZone(Long farmId, Long zoneId) {
        return deviceRepository.findByFarmId(farmId).stream()
            .filter(d -> zoneId == null || (d.getZone() != null && d.getZone().getId().equals(zoneId)))
            .map(Device::getDeviceId)
            .collect(Collectors.toList());
    }


     // Hàm lấy dữ liệu hiện tại cho zone
    public SensorDataDTO getLatestDataForZone(Long farmId, Long zoneId) {
        List<String> deviceIds = getDeviceIdsByFarmAndZone(farmId, zoneId);
        if (deviceIds.isEmpty()) return null;

        // Logic giống getLatestSensorDataForFarmDevices nhưng filter theo list deviceIds cụ thể
        // ... (bạn có thể copy logic và thay filter r.device_id)
         String deviceIdFilter = deviceIds.stream()
                .map(id -> String.format("r.device_id == \"%s\"", id))
                .collect(Collectors.joining(" or "));

        String query = String.format(
                "from(bucket: \"%s\") " +
                        "|> range(start: -30d) " +
                        "|> filter(fn: (r) => r._measurement == \"sensor_data\" and (%s)) " +
                        "|> last()",
                influxDBConfig.getBucket(),
                deviceIdFilter);
        
        // ... thực thi và map kết quả giống hàm cũ
        try {
            QueryApi queryApi = influxDBClient.getQueryApi();
            List<FluxTable> tables = queryApi.query(query);
            if (tables.isEmpty()) return null;
             var dtoBuilder = SensorDataDTO.builder();
             // ... (logic map giống hệt getLatestSensorDataForFarmDevices)
             for (FluxTable table : tables) {
                for (FluxRecord record : table.getRecords()) {
                     if (dtoBuilder.build().getDeviceId() == null) {
                        dtoBuilder.deviceId((String) record.getValueByKey("device_id"));
                        dtoBuilder.timestamp(record.getTime());
                    }
                    String field = record.getField();
                    Object value = record.getValue();
                     if (field != null && value instanceof Number) {
                        switch (field) {
                            case "temperature" -> dtoBuilder.temperature(((Number) value).doubleValue());
                            case "humidity" -> dtoBuilder.humidity(((Number) value).doubleValue());
                            case "soil_moisture" -> dtoBuilder.soilMoisture(((Number) value).doubleValue());
                            case "light_intensity" -> dtoBuilder.lightIntensity(((Number) value).doubleValue());
                            case "soilPH" -> dtoBuilder.soilPH(((Number) value).doubleValue());
                        }
                    }
                }
             }
             return dtoBuilder.build();
        } catch (Exception e) { return null; }
    }



// [SensorDataService.java]

    /**
     * TỐI ƯU HÓA: Lấy dữ liệu mới nhất cho một DANH SÁCH thiết bị (Batch Query).
     * Thay vì gọi 100 query lẻ, ta chỉ gọi 1 query duy nhất.
     */
    public Map<String, SensorDataDTO> getLatestDataForListDevices(java.util.Set<String> deviceIds) {
        if (deviceIds == null || deviceIds.isEmpty()) {
            return Collections.emptyMap();
        }

        // 1. Xây dựng bộ lọc dynamic: r.device_id == "A" or r.device_id == "B" ...
        String deviceFilter = deviceIds.stream()
                .map(id -> String.format("r.device_id == \"%s\"", id))
                .collect(Collectors.joining(" or "));

        // 2. Câu truy vấn gộp
        String query = String.format(
                "from(bucket: \"%s\")\n" +
                "  |> range(start: -24h)\n" +  // Tìm trong 24h qua
                "  |> filter(fn: (r) => r._measurement == \"sensor_data\")\n" +
                "  |> filter(fn: (r) => %s)\n" + // Chèn bộ lọc OR ở đây
                "  |> last()\n" + // Lấy giá trị mới nhất
                "  |> pivot(rowKey:[\"_time\"], columnKey: [\"_field\"], valueColumn: \"_value\")",
                influxDBConfig.getBucket(), 
                deviceFilter
        );

        log.debug(" [Batch Query] Executing for {} devices...", deviceIds.size());

        try {
            QueryApi queryApi = influxDBClient.getQueryApi();
            List<FluxTable> tables = queryApi.query(query, influxDBConfig.getOrg());

            Map<String, SensorDataDTO> resultMap = new HashMap<>();

            for (FluxTable table : tables) {
                for (FluxRecord record : table.getRecords()) {
                    String deviceId = (String) record.getValueByKey("device_id");
                    if (deviceId == null) continue;

                    // Map record sang DTO
                    Map<String, Object> values = record.getValues();
                    SensorDataDTO dto = SensorDataDTO.builder()
                            .deviceId(deviceId)
                            .timestamp(record.getTime())
                            .temperature(getDoubleValue(values, "temperature"))
                            .humidity(getDoubleValue(values, "humidity"))
                            .soilMoisture(getDoubleValue(values, "soil_moisture"))
                            .lightIntensity(getDoubleValue(values, "light_intensity"))
                            .soilPH(getDoubleValue(values, "soilPH"))
                            .build();
                    
                    resultMap.put(deviceId, dto);
                }
            }
            log.info(" [Batch Query] Đã lấy dữ liệu cho {} thiết bị trong 1 lần gọi.", resultMap.size());
            return resultMap;

        } catch (Exception e) {
            log.error(" [Batch Query] Lỗi: {}", e.getMessage());
            return Collections.emptyMap();
        }
    }
}
