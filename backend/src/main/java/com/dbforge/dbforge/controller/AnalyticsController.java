package com.dbforge.dbforge.controller;

import com.dbforge.dbforge.dto.AnalyticsResponse;
import com.dbforge.dbforge.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class AnalyticsController {
    
    private final AnalyticsService analyticsService;
    
    private Long getUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new RuntimeException("User not authenticated");
        }
        return (Long) authentication.getPrincipal();
    }
    
    @GetMapping
    public ResponseEntity<AnalyticsResponse> getAnalytics(Authentication authentication) {
        try {
            Long userId = getUserId(authentication);
            log.info("Fetching analytics for user: {}", userId);
            
            AnalyticsResponse analytics = analyticsService.getAnalytics(userId);
            return ResponseEntity.ok(analytics);
        } catch (Exception e) {
            log.error("Failed to fetch analytics", e);
            return ResponseEntity.status(500).build();
        }
    }
}
