package com.dbforge.dbforge.controller;

import com.dbforge.dbforge.dto.EncryptedQueryRequest;
import com.dbforge.dbforge.dto.QueryRequest;
import com.dbforge.dbforge.dto.QueryResult;
import com.dbforge.dbforge.model.DatabaseInstance;
import com.dbforge.dbforge.service.DatabaseService;
import com.dbforge.dbforge.service.MongoDBQueryService;
import com.dbforge.dbforge.service.QueryExecutionService;
import com.dbforge.dbforge.service.RedisQueryService;
import com.dbforge.dbforge.util.AesDecryptor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/databases/{instanceId}/query/encrypted")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class EncryptedQueryController {

    private final QueryExecutionService queryExecutionService;
    private final MongoDBQueryService mongoDBQueryService;
    private final RedisQueryService redisQueryService;
    private final DatabaseService databaseService;

    @PostMapping
    public ResponseEntity<QueryResult> executeEncryptedQuery(
            @PathVariable Long instanceId,
            @RequestHeader("Authorization") String auth,
            @RequestBody EncryptedQueryRequest request) {

        try {
            String token = auth.replace("Bearer ", "").trim();

            String decryptedJson = AesDecryptor.decrypt(request.getPayload(), token);
            log.info("Decrypted request: {}", decryptedJson);

            QueryRequest queryRequest = QueryRequest.fromJson(decryptedJson);

            DatabaseInstance instance = databaseService.getDatabaseById(instanceId);
            String dbType = instance.getDatabaseType().getName().toLowerCase();

            QueryResult result;

            if (dbType.equals("mongodb")) {
                result = mongoDBQueryService.executeMongoQuery(instance, queryRequest);
            } else if (dbType.equals("redis")) {
                result = redisQueryService.executeRedisCommand(instance, queryRequest);
            } else {
                // SQL
                result = queryExecutionService.executeQuery(instanceId, queryRequest);
            }

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Encrypted query failed", e);
            return ResponseEntity.ok(
                QueryResult.builder()
                    .success(false)
                    .error("Decryption or query execution failed: " + e.getMessage())
                    .build()
            );
        }
    }
}
