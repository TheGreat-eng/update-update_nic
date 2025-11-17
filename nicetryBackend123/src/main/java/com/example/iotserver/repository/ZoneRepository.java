package com.example.iotserver.repository;

import com.example.iotserver.entity.Zone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.lang.StackWalker.Option;
import java.util.List;
import java.util.Optional;

@Repository
public interface ZoneRepository extends JpaRepository<Zone, Long> {
    List<Zone> findByFarmId(Long farmId);

    Optional<Zone> findByIdAndFarmId(Long zoneId, Long farmId);
}
