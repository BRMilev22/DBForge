package com.dbforge.dbforge.controller;

import com.dbforge.dbforge.model.AuditLog;
import com.dbforge.dbforge.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/activity")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class ActivityController {
    
    private final AuditLogService auditLogService;
    
    @GetMapping
    public ResponseEntity<Map<String, Object>> getActivityLog(
            Authentication authentication,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String resourceType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Long userId = getUserIdFromAuth(authentication);
        
        Page<AuditLog> activityPage = auditLogService.getActivityLog(
                userId, action, resourceType, startDate, endDate, page, size);
        
        Map<String, Object> response = new HashMap<>();
        response.put("activities", activityPage.getContent());
        response.put("currentPage", activityPage.getNumber());
        response.put("totalPages", activityPage.getTotalPages());
        response.put("totalItems", activityPage.getTotalElements());
        response.put("hasMore", activityPage.hasNext());
        
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/recent")
    public ResponseEntity<List<AuditLog>> getRecentActivity(
            Authentication authentication,
            @RequestParam(defaultValue = "50") int limit) {
        
        Long userId = getUserIdFromAuth(authentication);
        List<AuditLog> recentActivity = auditLogService.getRecentActivity(userId, limit);
        
        return ResponseEntity.ok(recentActivity);
    }
    
    @DeleteMapping
    public ResponseEntity<Map<String, Object>> clearActivityLog(Authentication authentication) {
        Long userId = getUserIdFromAuth(authentication);
        try {
            long removed = auditLogService.clearActivityLog(userId);
            return ResponseEntity.ok(Map.of(
                    "cleared", removed,
                    "message", "Activity log cleared successfully"
            ));
        } catch (Exception e) {
            log.error("Failed to clear activity log for user {}", userId, e);
            return ResponseEntity.status(500)
                    .body(Map.of("error", "Failed to clear activity log"));
        }
    }
    
    private Long getUserIdFromAuth(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        return (Long) authentication.getPrincipal();
    }
}
