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