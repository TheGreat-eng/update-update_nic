package com.example.iotserver.scheduler;

import java.util.HashMap;
import java.util.Map;

import org.quartz.Job;
import org.quartz.JobDataMap;
import org.quartz.JobExecutionContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import com.example.iotserver.service.DeviceService;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class DeviceControlJob implements Job {

    @Autowired
    private DeviceService deviceService;

    @Autowired // Inject thêm Redis
    private StringRedisTemplate redisTemplate;

    private static final String MANUAL_OVERRIDE_PREFIX = "manual_override:";

    @Override
    public void execute(JobExecutionContext context) {
        JobDataMap dataMap = context.getJobDetail().getJobDataMap();
        String deviceId = dataMap.getString("deviceId");
        String action = dataMap.getString("action");
        int duration = dataMap.getInt("durationSeconds");

        log.info("Executing scheduled job: Action [{}] on device [{}]", action, deviceId);


        // [FIX 4: CHECK MANUAL OVERRIDE]
        String overrideKey = MANUAL_OVERRIDE_PREFIX + deviceId;
        if (Boolean.TRUE.equals(redisTemplate.hasKey(overrideKey))) {
            log.warn("BỎ QUA lịch trình cho thiết bị {} vì đang ở chế độ Manual Override (người dùng đang điều khiển).", deviceId);
            return; // Dừng ngay, không thực thi
        }
        // [KẾT THÚC FIX]



        try {
            Map<String, Object> params = new HashMap<>();
            if (duration > 0) {
                params.put("duration", duration);
            }

            String serviceAction = "TURN_ON".equalsIgnoreCase(action) ? "turn_on" : "turn_off";

            // <<< THAY ĐỔI QUAN TRỌNG Ở ĐÂY >>>
            // Gọi hàm nội bộ, không cần kiểm tra quyền người dùng
            deviceService.internalControlDevice(deviceId, serviceAction, params);
            // <<< KẾT THÚC THAY ĐỔI >>>

            log.info("Successfully executed scheduled job for device {}", deviceId);
        } catch (Exception e) {
            log.error("Failed to execute scheduled job for device {}: {}", deviceId, e.getMessage());
        }
    }
}