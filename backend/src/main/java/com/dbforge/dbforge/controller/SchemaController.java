package com.dbforge.dbforge.controller;

import com.dbforge.dbforge.dto.SchemaInfo;
import com.dbforge.dbforge.service.SchemaIntrospectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/databases/{instanceId}/schema")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class SchemaController {
    
    private final SchemaIntrospectionService schemaIntrospectionService;
    
    @GetMapping
    public ResponseEntity<SchemaInfo> getSchema(
            @PathVariable Long instanceId,
            Authentication authentication) {
        
        try {
            log.info("Getting schema for instance: {}", instanceId);
            SchemaInfo schema = schemaIntrospectionService.getSchema(instanceId);
            return ResponseEntity.ok(schema);
        } catch (Exception e) {
            log.error("Schema introspection failed: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
}
