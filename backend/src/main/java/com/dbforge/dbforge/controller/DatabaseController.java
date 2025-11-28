package com.dbforge.dbforge.controller;

import com.dbforge.dbforge.dto.CreateDatabaseRequest;
import com.dbforge.dbforge.dto.DatabaseResponse;
import com.dbforge.dbforge.model.DatabaseInstance;
import com.dbforge.dbforge.model.DatabaseType;
import com.dbforge.dbforge.model.User;
import com.dbforge.dbforge.repository.UserRepository;
import com.dbforge.dbforge.service.DatabaseService;
import com.dbforge.dbforge.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/databases")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class DatabaseController {
    
    private final DatabaseService databaseService;
    private final UserRepository userRepository;
    private final PaymentService paymentService;
    
    private Long getUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new RuntimeException("User not authenticated");
        }
        return (Long) authentication.getPrincipal();
    }
    
    @GetMapping("/types")
    public ResponseEntity<List<DatabaseType>> getAvailableTypes() {
        return ResponseEntity.ok(databaseService.getAvailableDatabaseTypes());
    }
    
    @PostMapping
    public ResponseEntity<?> createDatabase(
            @RequestBody CreateDatabaseRequest request,
            Authentication authentication) {
        
        try {
            Long userId = getUserId(authentication);
            
            // Check subscription limit
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            int currentDatabaseCount = databaseService.getUserDatabases(userId).size();
            int limit = user.getSubscriptionTier().getDatabaseLimit();
            
            if (currentDatabaseCount >= limit) {
                log.warn("User {} has reached database limit ({}/{})", user.getUsername(), currentDatabaseCount, limit);
                return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED).body(Map.of(
                    "error", "Database limit reached",
                    "message", "You have reached your limit of " + limit + " databases. Please upgrade your plan to create more.",
                    "currentCount", currentDatabaseCount,
                    "limit", limit,
                    "tier", user.getSubscriptionTier().name(),
                    "upgradeRequired", true
                ));
            }
            
            log.info("Creating database: {} for user: {} ({}/{})", 
                    request.getInstanceName(), userId, currentDatabaseCount + 1, limit);
            
            DatabaseInstance instance = databaseService.createDatabase(
                    userId,
                    request.getDatabaseType(),
                    request.getInstanceName(),
                    request.getDbUsername(),
                    request.getDbPassword()
            );
            
            return ResponseEntity.ok(DatabaseResponse.from(instance));
        } catch (Exception e) {
            log.error("Failed to create database", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
    
    @GetMapping
    public ResponseEntity<List<DatabaseResponse>> getUserDatabases(Authentication authentication) {
        
        try {
            Long userId = getUserId(authentication);
            List<DatabaseResponse> databases = databaseService.getUserDatabases(userId)
                    .stream()
                    .map(DatabaseResponse::from)
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(databases);
        } catch (Exception e) {
            log.error("Failed to get databases", e);
            return ResponseEntity.status(401).body(List.of());
        }
    }
    
    @GetMapping("/usage")
    public ResponseEntity<Map<String, Object>> getDatabaseUsage(Authentication authentication) {
        try {
            Long userId = getUserId(authentication);
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            int currentCount = databaseService.getUserDatabases(userId).size();
            int limit = user.getSubscriptionTier().getDatabaseLimit();
            
            return ResponseEntity.ok(Map.of(
                "currentCount", currentCount,
                "limit", limit,
                "tier", user.getSubscriptionTier().name(),
                "remaining", limit - currentCount,
                "percentUsed", Math.round((currentCount * 100.0) / limit),
                "canCreate", currentCount < limit
            ));
        } catch (Exception e) {
            log.error("Failed to get database usage", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<DatabaseResponse> getDatabase(
            @PathVariable Long id,
            Authentication authentication) {
        
        try {
            Long userId = getUserId(authentication);
            DatabaseInstance instance = databaseService.getDatabaseById(id);
            return ResponseEntity.ok(DatabaseResponse.from(instance));
        } catch (Exception e) {
            log.error("Failed to get database", e);
            return ResponseEntity.status(404).body(null);
        }
    }
    
    @PostMapping("/{id}/start")
    public ResponseEntity<String> startDatabase(
            @PathVariable Long id,
            Authentication authentication) {
        
        try {
            Long userId = getUserId(authentication);
            databaseService.startDatabase(id, userId);
            return ResponseEntity.ok("Database started");
        } catch (Exception e) {
            log.error("Failed to start database", e);
            return ResponseEntity.status(500).body("Failed to start database");
        }
    }
    
    @PostMapping("/{id}/stop")
    public ResponseEntity<String> stopDatabase(
            @PathVariable Long id,
            Authentication authentication) {
        
        try {
            Long userId = getUserId(authentication);
            databaseService.stopDatabase(id, userId);
            return ResponseEntity.ok("Database stopped");
        } catch (Exception e) {
            log.error("Failed to stop database", e);
            return ResponseEntity.status(500).body("Failed to stop database");
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteDatabase(
            @PathVariable Long id,
            Authentication authentication) {
        
        try {
            Long userId = getUserId(authentication);
            databaseService.deleteDatabase(id, userId);
            return ResponseEntity.ok("Database deleted");
        } catch (Exception e) {
            log.error("Failed to delete database", e);
            return ResponseEntity.status(500).body("Failed to delete database");
        }
    }

    @PostMapping("/{id}/token")
    public ResponseEntity<?> generateApiToken(
            @PathVariable Long id,
            Authentication authentication) {
        try {
            Long userId = getUserId(authentication);
            String token = databaseService.generateApiTokenForInstance(id, userId);
            return ResponseEntity.ok(Map.of("apiToken", token));
        } catch (Exception e) {
            log.error("Failed to generate API token", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/public/token/{apiToken}")
    public ResponseEntity<?> getDatabaseByApiToken(@PathVariable String apiToken) {
        try {
            DatabaseInstance instance = databaseService.getDatabaseByApiToken(apiToken);
            return ResponseEntity.ok(DatabaseResponse.from(instance));
        } catch (Exception e) {
            log.error("Failed to fetch database via API token lookup", e);
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }
}
