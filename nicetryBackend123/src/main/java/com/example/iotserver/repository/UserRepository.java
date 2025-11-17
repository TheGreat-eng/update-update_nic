package com.example.iotserver.repository;

import com.example.iotserver.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query; // <<<< THÊM IMPORT
import org.springframework.data.repository.query.Param; // <<<< THÊM IMPORT
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    // <<<< THAY THẾ PHƯƠNG THỨC NÀY >>>>
    // Page<User> findAll(Pageable pageable);
    // BẰNG PHƯƠNG THỨC MỚI CÓ KHẢ NĂNG TÌM KIẾM
    @Query("SELECT u FROM User u WHERE " +
            "LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<User> searchUsers(@Param("keyword") String keyword, Pageable pageable);

    Optional<User> findByRefreshToken(String refreshToken);

    // <<<< THÊM PHƯƠNG THỨC NÀY ĐỂ TÌM TẤT CẢ USER (KỂ CẢ DELETED) >>>>
    // Sử dụng nativeQuery để bỏ qua filter @SQLRestriction
    @Query(value = "SELECT * FROM users WHERE id = :userId", nativeQuery = true)
    Optional<User> findByIdEvenIfDeleted(@Param("userId") Long userId);
}