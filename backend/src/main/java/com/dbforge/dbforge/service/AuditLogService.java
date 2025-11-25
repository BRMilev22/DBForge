package com.dbforge.dbforge.service;

import com.dbforge.dbforge.model.AuditLog;
import com.dbforge.dbforge.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class AuditLogService {
    
    private final AuditLogRepository auditLogRepository;
    
    public void logAction(Long userId, String action, String resourceType, Long resourceId, 
                         String resourceName, AuditLog.Status status, String details) {
        try {
            HttpServletRequest request = getCurrentRequest();
            
            AuditLog auditLog = AuditLog.builder()
                    .userId(userId)
                    .action(action)
                    .resourceType(resourceType)
                    .resourceId(resourceId)
                    .resourceName(resourceName)
                    .ipAddress(request != null ? getClientIp(request) : null)
                    .userAgent(request != null ? request.getHeader("User-Agent") : null)
                    .status(status)
                    .details(details)
                    .build();
            
            auditLogRepository.save(auditLog);
            log.debug("Audit log created: {} - {} - {}", action, resourceName, status);
        } catch (Exception e) {
            log.error("Failed to create audit log", e);
        }
    }
    
    public void logSuccess(Long userId, String action, String resourceType, Long resourceId, String resourceName) {
        logAction(userId, action, resourceType, resourceId, resourceName, AuditLog.Status.SUCCESS, null);
    }
    
    public void logSuccess(Long userId, String action, String resourceType, Long resourceId, 
                          String resourceName, String details) {
        logAction(userId, action, resourceType, resourceId, resourceName, AuditLog.Status.SUCCESS, details);
    }
    
    public void logFailure(Long userId, String action, String resourceType, Long resourceId, 
                          String resourceName, String errorMessage) {
        logAction(userId, action, resourceType, resourceId, resourceName, AuditLog.Status.FAILURE, errorMessage);
    }
    
    public List<AuditLog> getRecentActivity(Long userId, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return auditLogRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable).getContent();
    }
    
    public Page<AuditLog> getActivityLog(Long userId, String action, String resourceType, 
                                         LocalDateTime startDate, LocalDateTime endDate, 
                                         int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        
        if (action != null && !action.isEmpty()) {
            return auditLogRepository.findByUserIdAndActionContainingIgnoreCaseOrderByCreatedAtDesc(
                    userId, action, pageable);
        }
        
        if (resourceType != null && !resourceType.isEmpty()) {
            return auditLogRepository.findByUserIdAndResourceTypeOrderByCreatedAtDesc(
                    userId, resourceType, pageable);
        }
        
        if (startDate != null && endDate != null) {
            return auditLogRepository.findByUserIdAndCreatedAtBetweenOrderByCreatedAtDesc(
                    userId, startDate, endDate, pageable);
        }
        
        return auditLogRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }
    
    @Transactional
    public long clearActivityLog(Long userId) {
        long deleted = auditLogRepository.deleteByUserId(userId);
        log.info("Cleared {} audit log entr{} for user {}", deleted, deleted == 1 ? "y" : "ies", userId);
        return deleted;
    }
    
    private HttpServletRequest getCurrentRequest() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            return attributes != null ? attributes.getRequest() : null;
        } catch (Exception e) {
            return null;
        }
    }
    
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        return ip != null && ip.contains(",") ? ip.split(",")[0].trim() : ip;
    }
}
