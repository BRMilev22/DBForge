package com.dbforge.dbforge.controller;

import com.dbforge.dbforge.dto.ExportRequest;
import com.dbforge.dbforge.service.DatabaseService;
import com.dbforge.dbforge.service.ExportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/databases/{instanceId}/export")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class ExportController {

    private final ExportService exportService;
    private final DatabaseService databaseService;

    private Long getUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new RuntimeException("User not authenticated");
        }
        return (Long) authentication.getPrincipal();
    }

    @PostMapping
    public ResponseEntity<byte[]> exportDatabase(
            @PathVariable Long instanceId,
            @RequestBody ExportRequest request,
            Authentication authentication
    ) {
        try {
            Long userId = getUserId(authentication);
            var instance = databaseService.getDatabaseById(instanceId);
            if (!instance.getUserId().equals(userId)) {
                return ResponseEntity.status(403).body(null);
            }

            var exportFile = exportService.exportDatabase(instanceId, userId, request);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + exportFile.filename() + "\"")
                    .contentType(exportFile.contentType())
                    .body(exportFile.data());
        } catch (Exception e) {
            log.error("Export failed for database {}: {}", instanceId, e.getMessage());
            return ResponseEntity.status(500)
                    .body(("Export failed: " + e.getMessage()).getBytes());
        }
    }
}
