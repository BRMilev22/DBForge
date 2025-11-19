package com.dbforge.dbforge.controller;

import com.dbforge.dbforge.dto.QueryRequest;
import com.dbforge.dbforge.dto.QueryResult;
import com.dbforge.dbforge.dto.SchemaInfo;
import com.dbforge.dbforge.model.DatabaseInstance;
import com.dbforge.dbforge.service.DatabaseService;
import com.dbforge.dbforge.service.MongoDBQueryService;
import com.dbforge.dbforge.service.QueryExecutionService;
import com.dbforge.dbforge.service.RedisQueryService;
import com.dbforge.dbforge.service.SchemaIntrospectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/databases/{instanceId}/query")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class QueryController {
    
    private final QueryExecutionService queryExecutionService;
    private final MongoDBQueryService mongoDBQueryService;
    private final RedisQueryService redisQueryService;
    private final DatabaseService databaseService;
    
    @PostMapping
    public ResponseEntity<QueryResult> executeQuery(
            @PathVariable Long instanceId,
            @RequestBody QueryRequest request,
            Authentication authentication) {
        
        try {
            log.info("Executing query on instance: {}", instanceId);
            
            // Get database instance to determine type
            DatabaseInstance instance = databaseService.getDatabaseById(instanceId);
            String dbType = instance.getDatabaseType().getName().toLowerCase();
            
            QueryResult result;
            
            // Route to appropriate service based on database type
            if (dbType.equals("mongodb")) {
                log.info("Routing to MongoDB query service");
                result = mongoDBQueryService.executeMongoQuery(instance, request);
            } else if (dbType.equals("redis")) {
                log.info("Routing to Redis query service");
                result = redisQueryService.executeRedisCommand(instance, request);
            } else {
                // SQL databases (mysql, mariadb, postgresql)
                log.info("Routing to SQL query service");
                result = queryExecutionService.executeQuery(instanceId, request);
            }
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Query execution failed: {}", e.getMessage());
            return ResponseEntity.ok(QueryResult.builder()
                .success(false)
                .error(e.getMessage())
                .build());
        }
    }
}
