package com.dbforge.dbforge.service;

import com.dbforge.dbforge.dto.QueryRequest;
import com.dbforge.dbforge.dto.QueryResult;
import com.dbforge.dbforge.model.DatabaseInstance;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@Slf4j
public class MongoDBQueryService {

    public QueryResult executeMongoQuery(DatabaseInstance instance, QueryRequest request) {
        long startTime = System.currentTimeMillis();
        
        // Use localhost since backend runs on same server as Docker containers
        String host = "localhost";
        
        String connectionString = String.format("mongodb://%s:%s@%s:%d/%s",
            instance.getUsername(),
            instance.getPassword(),
            host,
            instance.getPort(),
            instance.getDatabaseName()
        );

        try (MongoClient mongoClient = MongoClients.create(connectionString)) {
            MongoDatabase database = mongoClient.getDatabase(instance.getDatabaseName());
            
            // Parse the query
            String query = request.getQuery().trim();
            
            // Simple query parsing - real implementation would need a proper parser
            if (query.startsWith("db.") || query.startsWith("use ")) {
                return executeMongoCommand(database, query, request.getLimit());
            } else {
                return QueryResult.builder()
                    .success(false)
                    .error("Query must start with 'db.' (e.g., db.users.find({}))")
                    .build();
            }
            
        } catch (Exception e) {
            log.error("MongoDB query execution error: {}", e.getMessage());
            long executionTime = System.currentTimeMillis() - startTime;
            return QueryResult.builder()
                .success(false)
                .error(e.getMessage())
                .executionTimeMs(executionTime)
                .build();
        }
    }

    private QueryResult executeMongoCommand(MongoDatabase database, String query, Integer limit) {
        long startTime = System.currentTimeMillis();
        
        try {
            // Extract collection name and operation
            // Example: db.users.find({name: "John"})
            String[] parts = query.split("\\.", 3);
            if (parts.length < 3) {
                return QueryResult.builder()
                    .success(false)
                    .error("Invalid MongoDB query format")
                    .build();
            }
            
            String collectionName = parts[1];
            String operation = parts[2];
            
            MongoCollection<Document> collection = database.getCollection(collectionName);
            
            // Handle different operations
            if (operation.startsWith("find")) {
                return executeFindQuery(collection, operation, limit, startTime);
            } else if (operation.startsWith("insertOne") || operation.startsWith("insertMany")) {
                return executeInsertQuery(collection, operation, startTime);
            } else if (operation.startsWith("updateOne") || operation.startsWith("updateMany")) {
                return executeUpdateQuery(collection, operation, startTime);
            } else if (operation.startsWith("deleteOne") || operation.startsWith("deleteMany")) {
                return executeDeleteQuery(collection, operation, startTime);
            } else if (operation.startsWith("count")) {
                return executeCountQuery(collection, startTime);
            } else {
                return QueryResult.builder()
                    .success(false)
                    .error("Unsupported operation: " + operation)
                    .build();
            }
            
        } catch (Exception e) {
            log.error("MongoDB command execution error: {}", e.getMessage());
            long executionTime = System.currentTimeMillis() - startTime;
            return QueryResult.builder()
                .success(false)
                .error(e.getMessage())
                .executionTimeMs(executionTime)
                .build();
        }
    }

    private QueryResult executeFindQuery(MongoCollection<Document> collection, String operation, Integer limit, long startTime) {
        List<Document> documents;
        
        // Simple find() or find({})
        if (operation.equals("find()") || operation.equals("find({})")) {
            documents = collection.find()
                .limit(limit != null ? limit : 100)
                .into(new ArrayList<>());
        } else {
            // For now, just do find all - proper query parsing would go here
            documents = collection.find()
                .limit(limit != null ? limit : 100)
                .into(new ArrayList<>());
        }
        
        if (documents.isEmpty()) {
            return QueryResult.builder()
                .success(true)
                .queryType("FIND")
                .columns(new ArrayList<>())
                .rows(new ArrayList<>())
                .rowCount(0)
                .executionTimeMs(System.currentTimeMillis() - startTime)
                .build();
        }
        
        // Extract columns from first document
        Set<String> columnSet = new LinkedHashSet<>();
        for (Document doc : documents) {
            columnSet.addAll(doc.keySet());
        }
        List<String> columns = new ArrayList<>(columnSet);
        
        // Convert documents to rows
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Document doc : documents) {
            Map<String, Object> row = new HashMap<>();
            for (String key : columns) {
                Object value = doc.get(key);
                row.put(key, value != null ? value.toString() : null);
            }
            rows.add(row);
        }
        
        return QueryResult.builder()
            .success(true)
            .queryType("FIND")
            .columns(columns)
            .rows(rows)
            .rowCount(rows.size())
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .build();
    }

    private QueryResult executeInsertQuery(MongoCollection<Document> collection, String operation, long startTime) {
        // Simplified - real implementation would parse the insert document
        return QueryResult.builder()
            .success(true)
            .queryType("INSERT")
            .affectedRows(1)
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .message("Insert operation requires proper document parsing")
            .build();
    }

    private QueryResult executeUpdateQuery(MongoCollection<Document> collection, String operation, long startTime) {
        return QueryResult.builder()
            .success(true)
            .queryType("UPDATE")
            .affectedRows(0)
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .message("Update operation requires proper query parsing")
            .build();
    }

    private QueryResult executeDeleteQuery(MongoCollection<Document> collection, String operation, long startTime) {
        return QueryResult.builder()
            .success(true)
            .queryType("DELETE")
            .affectedRows(0)
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .message("Delete operation requires proper query parsing")
            .build();
    }

    private QueryResult executeCountQuery(MongoCollection<Document> collection, long startTime) {
        long count = collection.countDocuments();
        
        Map<String, Object> row = new HashMap<>();
        row.put("count", count);
        
        return QueryResult.builder()
            .success(true)
            .queryType("COUNT")
            .columns(List.of("count"))
            .rows(List.of(row))
            .rowCount(1)
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .build();
    }

    public List<String> getCollections(DatabaseInstance instance) {
        // Use localhost since backend runs on same server as Docker containers
        String host = "localhost";
        
        String connectionString = String.format("mongodb://%s:%s@%s:%d/%s",
            instance.getUsername(),
            instance.getPassword(),
            host,
            instance.getPort(),
            instance.getDatabaseName()
        );

        try (MongoClient mongoClient = MongoClients.create(connectionString)) {
            MongoDatabase database = mongoClient.getDatabase(instance.getDatabaseName());
            List<String> collections = new ArrayList<>();
            database.listCollectionNames().into(collections);
            return collections;
        } catch (Exception e) {
            log.error("Failed to get MongoDB collections: {}", e.getMessage());
            return new ArrayList<>();
        }
    }
}
