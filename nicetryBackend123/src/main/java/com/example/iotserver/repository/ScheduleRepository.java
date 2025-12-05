package com.example.iotserver.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.iotserver.entity.Schedule;

@Repository
public interface ScheduleRepository extends JpaRepository<Schedule, Long> {
    List<Schedule> findByFarmId(Long farmId);

    List<Schedule> findByEnabled(boolean enabled);

    // [FIX 1]: Thêm phương thức tìm theo deviceId để xóa "lịch trình ma"
    List<Schedule> findByDeviceId(String deviceId);
}