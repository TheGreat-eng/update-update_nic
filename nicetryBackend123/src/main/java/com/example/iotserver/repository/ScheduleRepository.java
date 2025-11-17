package com.example.iotserver.repository;

import com.example.iotserver.entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScheduleRepository extends JpaRepository<Schedule, Long> {
    List<Schedule> findByFarmId(Long farmId);

    List<Schedule> findByEnabled(boolean enabled);
}