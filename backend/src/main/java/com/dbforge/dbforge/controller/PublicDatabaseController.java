package com.dbforge.dbforge.controller;

import com.dbforge.dbforge.dto.DatabaseResponse;
import com.dbforge.dbforge.dto.QueryRequest;
import com.dbforge.dbforge.dto.QueryResult;
import com.dbforge.dbforge.model.DatabaseInstance;
import com.dbforge.dbforge.service.DatabaseService;
import com.dbforge.dbforge.service.MongoDBQueryService;
import com.dbforge.dbforge.service.QueryExecutionService;
import com.dbforge.dbforge.service.RedisQueryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/databases")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class PublicDatabaseController {

    private final DatabaseService databaseService;
    private final QueryExecutionService queryExecutionService;
    private final MongoDBQueryService mongoDBQueryService;
    private final RedisQueryService redisQueryService;

    @GetMapping("/{apiToken}")
    public ResponseEntity<?> getDatabaseByToken(@PathVariable String apiToken) {
        try {
            DatabaseInstance instance = databaseService.getDatabaseByApiToken(apiToken);
            return ResponseEntity.ok(DatabaseResponse.from(instance));
        } catch (Exception e) {
            log.error("Failed to fetch database via public token lookup", e);
            return ResponseEntity.status(404).body(
                java.util.Map.of("error", "Database not found for provided token")
            );
        }
    }

    @PostMapping("/{apiToken}/query")
    public ResponseEntity<QueryResult> executeQueryByToken(
            @PathVariable String apiToken,
            @RequestBody QueryRequest request) {

        try {
            DatabaseInstance instance = databaseService.getDatabaseByApiToken(apiToken);
            String dbType = instance.getDatabaseType().getName().toLowerCase();

            QueryResult result;
            if (dbType.equals("mongodb")) {
                result = mongoDBQueryService.executeMongoQuery(instance, request);
            } else if (dbType.equals("redis")) {
                result = redisQueryService.executeRedisCommand(instance, request);
            } else {
                result = queryExecutionService.executeQuery(instance.getId(), request);
            }

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Query execution failed for token lookup", e);
            return ResponseEntity.ok(QueryResult.builder()
                .success(false)
                .error(e.getMessage())
                .build());
        }
    }
}
