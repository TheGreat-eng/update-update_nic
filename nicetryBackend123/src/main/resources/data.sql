-- Thêm các dòng này vào cuối file data.sql
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('PLANT_HEALTH_FUNGUS_HUMIDITY_THRESHOLD', '85.0', 'Ngưỡng độ ẩm không khí để cảnh báo nguy cơ nấm (%).'),
('PLANT_HEALTH_FUNGUS_TEMP_MIN', '20.0', 'Nhiệt độ tối thiểu để cảnh báo nguy cơ nấm (°C).'),
('PLANT_HEALTH_FUNGUS_TEMP_MAX', '28.0', 'Nhiệt độ tối đa để cảnh báo nguy cơ nấm (°C).'),
('PLANT_HEALTH_HEAT_STRESS_THRESHOLD', '38.0', 'Ngưỡng nhiệt độ để cảnh báo stress nhiệt (°C).'),
('PLANT_HEALTH_DROUGHT_THRESHOLD', '30.0', 'Ngưỡng độ ẩm đất để cảnh báo thiếu nước (%).'),
('PLANT_HEALTH_COLD_THRESHOLD', '12.0', 'Ngưỡng nhiệt độ thấp (ban đêm) để cảnh báo nguy cơ lạnh (°C).'),
('PLANT_HEALTH_MOISTURE_CHANGE_THRESHOLD', '30.0', 'Ngưỡng thay đổi độ ẩm đất trong 6 giờ để cảnh báo (%).'),
('PLANT_HEALTH_LIGHT_THRESHOLD', '1000.0', 'Ngưỡng ánh sáng thấp (ban ngày) để cảnh báo (lux).'),
('PLANT_HEALTH_PH_MIN', '5.0', 'Ngưỡng pH đất tối thiểu.'),
('PLANT_HEALTH_PH_MAX', '7.5', 'Ngưỡng pH đất tối đa.')
ON DUPLICATE KEY UPDATE setting_key=setting_key;

CREATE TABLE IF NOT EXISTS schedules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    farm_id BIGINT NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    action ENUM('TURN_ON', 'TURN_OFF') NOT NULL,
    cron_expression VARCHAR(255) NOT NULL,
    duration_seconds INT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    farm_id BIGINT NOT NULL,
    user_id BIGINT, -- Có thể NULL nếu là hành động của hệ thống
    actor_name VARCHAR(255) NOT NULL, -- Tên người dùng hoặc "Hệ thống"
    action_type VARCHAR(50) NOT NULL, -- Ví dụ: DEVICE_CONTROL, RULE_UPDATE
    target_type VARCHAR(50), -- Ví dụ: DEVICE, RULE
    target_id VARCHAR(255), -- ID của đối tượng bị tác động
    description TEXT NOT NULL, -- Mô tả chi tiết hành động
    status VARCHAR(20) NOT NULL, -- SUCCESS, FAILED
    details TEXT, -- Chi tiết thêm dạng JSON (nếu cần)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS farm_settings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    farm_id BIGINT NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT NOT NULL,
    UNIQUE KEY uk_farm_setting (farm_id, setting_key),
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);



-- FILE: src/main/resources/data.sql (Thêm vào cuối)

-- ===============================================================
-- Bảng 1: PLANT PROFILES - Lưu danh sách các hồ sơ cây trồng
-- ===============================================================
CREATE TABLE IF NOT EXISTS plant_profiles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    scientific_name VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ===============================================================
-- Bảng 2: PLANT PROFILE SETTINGS - Lưu các ngưỡng riêng của từng hồ sơ
-- ===============================================================
CREATE TABLE IF NOT EXISTS plant_profile_settings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    profile_id BIGINT NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value VARCHAR(255) NOT NULL,
    UNIQUE KEY uk_profile_setting (profile_id, setting_key),
    FOREIGN KEY (profile_id) REFERENCES plant_profiles(id) ON DELETE CASCADE
);

-- ===============================================================
-- Cập nhật bảng `zones` để thêm liên kết tới hồ sơ cây trồng
-- ===============================================================
-- Lệnh này chỉ chạy nếu cột chưa tồn tại, an toàn để chạy lại
-- Lệnh này có thể gây lỗi nếu constraint đã tồn tại, có thể bỏ qua nếu đã có
-- ALTER TABLE zones ADD CONSTRAINT IF NOT EXISTS fk_zone_plant_profile FOREIGN KEY (plant_profile_id) REFERENCES plant_profiles(id);


-- ===============================================================
-- DỮ LIỆU MẪU (Rất quan trọng để test)
-- ===============================================================
-- Tạo hồ sơ mẫu
INSERT INTO plant_profiles (id, name, description) VALUES
(1, 'Cà chua', 'Hồ sơ chăm sóc tiêu chuẩn cho cây cà chua.'),
(2, 'Xà lách', 'Hồ sơ cho các loại rau ăn lá ưa mát, nhạy cảm với nhiệt.')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Cài đặt ngưỡng cho "Cà chua" (id=1)
INSERT INTO plant_profile_settings (profile_id, setting_key, setting_value) VALUES
(1, 'PLANT_HEALTH_HEAT_STRESS_THRESHOLD', '35.0'),
(1, 'PLANT_HEALTH_DROUGHT_THRESHOLD', '40.0'),
(1, 'PLANT_HEALTH_PH_MIN', '6.0'),
(1, 'PLANT_HEALTH_PH_MAX', '6.8')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);

-- Cài đặt ngưỡng cho "Xà lách" (id=2)
INSERT INTO plant_profile_settings (profile_id, setting_key, setting_value) VALUES
(2, 'PLANT_HEALTH_HEAT_STRESS_THRESHOLD', '30.0'),
(2, 'PLANT_HEALTH_DROUGHT_THRESHOLD', '50.0'),
(2, 'PLANT_HEALTH_PH_MIN', '6.0'),
(2, 'PLANT_HEALTH_PH_MAX', '7.0')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);







-- Chạy lệnh này trong MySQL Workbench hoặc Terminal
-- ALTER TABLE plant_health_alerts ADD COLUMN zone_id BIGINT NULL;
-- ALTER TABLE plant_health_alerts ADD COLUMN device_id VARCHAR(255) NULL;
-- ALTER TABLE plant_health_alerts ADD CONSTRAINT fk_alert_zone FOREIGN KEY (zone_id) REFERENCES zones(id);