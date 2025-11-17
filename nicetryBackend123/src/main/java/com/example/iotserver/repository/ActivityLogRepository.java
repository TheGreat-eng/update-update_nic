package com.example.iotserver.repository;

import com.example.iotserver.entity.ActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    Page<ActivityLog> findByFarmIdOrderByCreatedAtDesc(Long farmId, Pageable pageable);
}