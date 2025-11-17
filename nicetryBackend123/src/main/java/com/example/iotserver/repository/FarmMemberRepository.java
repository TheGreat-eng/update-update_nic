package com.example.iotserver.repository;

import com.example.iotserver.entity.FarmMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FarmMemberRepository extends JpaRepository<FarmMember, Long> {
    Optional<FarmMember> findByFarmIdAndUserId(Long farmId, Long userId);

    List<FarmMember> findByFarmId(Long farmId);

    List<FarmMember> findByUserId(Long userId);

    void deleteByFarmIdAndUserId(Long farmId, Long userId);
}