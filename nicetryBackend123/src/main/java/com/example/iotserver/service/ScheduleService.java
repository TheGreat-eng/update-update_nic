package com.example.iotserver.service;

import java.util.List;
import java.util.stream.Collectors;

import org.quartz.CronScheduleBuilder;
import org.quartz.JobBuilder;
import org.quartz.JobDataMap;
import org.quartz.JobDetail;
import org.quartz.JobKey;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.quartz.Trigger;
import org.quartz.TriggerBuilder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.iotserver.dto.ScheduleDTO;
import com.example.iotserver.entity.Device;
import com.example.iotserver.entity.Farm;
import com.example.iotserver.entity.Schedule;
import com.example.iotserver.exception.ResourceNotFoundException;
import com.example.iotserver.repository.DeviceRepository;
import com.example.iotserver.repository.FarmRepository;
import com.example.iotserver.repository.ScheduleRepository;
import com.example.iotserver.scheduler.DeviceControlJob;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class ScheduleService {

    private final Scheduler quartzScheduler;
    private final ScheduleRepository scheduleRepository;
    private final FarmRepository farmRepository;
    private final DeviceRepository deviceRepository;

    // Tự động load tất cả lịch trình từ DB khi khởi động ứng dụng
    @PostConstruct
    public void init() {
        log.info("Initializing schedules from database...");
        scheduleRepository.findByEnabled(true).forEach(this::scheduleJob);
    }

    // Lấy danh sách
    public List<ScheduleDTO> getSchedulesByFarm(Long farmId) {
        return scheduleRepository.findByFarmId(farmId).stream()
                .map(this::mapToDTO).collect(Collectors.toList());
    }

    // Tạo mới
    @Transactional
    public ScheduleDTO createSchedule(Long farmId, ScheduleDTO dto) {
        Farm farm = farmRepository.findById(farmId)
                .orElseThrow(() -> new ResourceNotFoundException("Farm", "id", farmId));

        Schedule schedule = Schedule.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .farm(farm)
                .deviceId(dto.getDeviceId())
                .action(Schedule.ActionType.valueOf(dto.getAction()))
                .cronExpression(dto.getCronExpression())
                .durationSeconds(dto.getDurationSeconds())
                .enabled(dto.isEnabled())
                .build();

        Schedule saved = scheduleRepository.save(schedule);
        if (saved.isEnabled()) {
            scheduleJob(saved);
        }
        return mapToDTO(saved);
    }

    // Cập nhật
    @Transactional
    public ScheduleDTO updateSchedule(Long scheduleId, ScheduleDTO dto) {
        Schedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule", "id", scheduleId));

        // Cập nhật thông tin
        schedule.setName(dto.getName());
        schedule.setDescription(dto.getDescription());
        schedule.setDeviceId(dto.getDeviceId());
        schedule.setAction(Schedule.ActionType.valueOf(dto.getAction()));
        schedule.setCronExpression(dto.getCronExpression());
        schedule.setDurationSeconds(dto.getDurationSeconds());
        schedule.setEnabled(dto.isEnabled());

        Schedule saved = scheduleRepository.save(schedule);

        // Lên lịch lại job trong Quartz
        unscheduleJob(saved); // Xóa job cũ
        if (saved.isEnabled()) {
            scheduleJob(saved); // Tạo job mới
        }

        return mapToDTO(saved);
    }

    // Xóa
    @Transactional
    public void deleteSchedule(Long scheduleId) {
        Schedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule", "id", scheduleId));
        unscheduleJob(schedule);
        scheduleRepository.delete(schedule);
    }

    // --- Các hàm private tương tác với Quartz ---

    private void scheduleJob(Schedule schedule) {
        try {
            JobDetail jobDetail = buildJobDetail(schedule);
            Trigger trigger = buildTrigger(schedule, jobDetail);
            quartzScheduler.scheduleJob(jobDetail, trigger);
            log.info("Scheduled job for schedule ID: {}", schedule.getId());
        } catch (SchedulerException e) {
            log.error("Error scheduling job for schedule ID {}: {}", schedule.getId(), e.getMessage());
        }
    }

    private void unscheduleJob(Schedule schedule) {
        try {
            quartzScheduler.deleteJob(new JobKey("schedule_" + schedule.getId()));
            log.info("Unscheduled job for schedule ID: {}", schedule.getId());
        } catch (SchedulerException e) {
            log.error("Error unscheduling job for schedule ID {}: {}", schedule.getId(), e.getMessage());
        }
    }

    private JobDetail buildJobDetail(Schedule schedule) {
        JobDataMap jobDataMap = new JobDataMap();
        jobDataMap.put("deviceId", schedule.getDeviceId());
        jobDataMap.put("action", schedule.getAction().name());
        jobDataMap.put("durationSeconds", schedule.getDurationSeconds() != null ? schedule.getDurationSeconds() : 0);

        return JobBuilder.newJob(DeviceControlJob.class)
                .withIdentity("schedule_" + schedule.getId())
                .withDescription(schedule.getName())
                .usingJobData(jobDataMap)
                .storeDurably()
                .build();
    }

    private Trigger buildTrigger(Schedule schedule, JobDetail jobDetail) {
        return TriggerBuilder.newTrigger()
                .forJob(jobDetail)
                .withIdentity("trigger_" + schedule.getId())
                .withDescription(schedule.getName())
                .withSchedule(CronScheduleBuilder.cronSchedule(schedule.getCronExpression())
                        .inTimeZone(java.util.TimeZone.getTimeZone("Asia/Ho_Chi_Minh"))
                        .withMisfireHandlingInstructionDoNothing()) // [FIX 1: Bỏ qua job đã lỡ]
                .build();
    }

    private ScheduleDTO mapToDTO(Schedule schedule) {
        String deviceName = deviceRepository.findByDeviceId(schedule.getDeviceId())
                .map(Device::getName).orElse("Không rõ");

        return ScheduleDTO.builder()
                .id(schedule.getId())
                .name(schedule.getName())
                .description(schedule.getDescription())
                .farmId(schedule.getFarm().getId())
                .deviceId(schedule.getDeviceId())
                .deviceName(deviceName)
                .action(schedule.getAction().name())
                .cronExpression(schedule.getCronExpression())
                .durationSeconds(schedule.getDurationSeconds())
                .enabled(schedule.isEnabled())
                .build();
    }
}