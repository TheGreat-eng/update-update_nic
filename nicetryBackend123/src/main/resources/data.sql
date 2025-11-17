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