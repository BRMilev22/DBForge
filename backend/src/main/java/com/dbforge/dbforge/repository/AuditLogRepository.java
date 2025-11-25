package com.dbforge.dbforge.repository;

import com.dbforge.dbforge.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    
    List<AuditLog> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    Page<AuditLog> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    
    Page<AuditLog> findByUserIdAndActionContainingIgnoreCaseOrderByCreatedAtDesc(
            Long userId, String action, Pageable pageable);
    
    Page<AuditLog> findByUserIdAndResourceTypeOrderByCreatedAtDesc(
            Long userId, String resourceType, Pageable pageable);
    
    Page<AuditLog> findByUserIdAndCreatedAtBetweenOrderByCreatedAtDesc(
            Long userId, LocalDateTime start, LocalDateTime end, Pageable pageable);
    
    List<AuditLog> findTop20ByUserIdOrderByCreatedAtDesc(Long userId);
    
    long deleteByUserId(Long userId);
}
