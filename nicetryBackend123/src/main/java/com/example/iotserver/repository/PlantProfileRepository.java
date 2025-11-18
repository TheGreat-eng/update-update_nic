// TẠO FILE MỚI: src/main/java/com/example/iotserver/repository/PlantProfileRepository.java
package com.example.iotserver.repository;

import com.example.iotserver.entity.PlantProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PlantProfileRepository extends JpaRepository<PlantProfile, Long> {
}