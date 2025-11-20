package com.dbforge.dbforge.service;

import com.dbforge.dbforge.dto.QueryRequest;
import com.dbforge.dbforge.dto.QueryResult;
import com.dbforge.dbforge.dto.SchemaInfo;
import com.dbforge.dbforge.model.DatabaseInstance;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@Slf4j
public class MongoDBQueryService {

    public QueryResult executeMongoQuery(DatabaseInstance instance, QueryRequest request) {
        long startTime = System.currentTimeMillis();
        
        // Use localhost since backend runs on same server as Docker containers
        String host = "localhost";
        
        // MongoDB root user is created in 'admin' database, so authenticate there
        String connectionString = String.format("mongodb://%s:%s@%s:%d/%s?authSource=admin",
            instance.getUsername(),
            instance.getPassword(),
            host,
            instance.getPort(),
            instance.getDatabaseName()
        );

        try (MongoClient mongoClient = MongoClients.create(connectionString)) {
            MongoDatabase database = mongoClient.getDatabase(instance.getDatabaseName());
            
            // Parse the query - remove comments and whitespace
            String query = request.getQuery().trim();
            
            // Remove single-line comments and normalize
            String[] lines = query.split("\\n");
            StringBuilder cleaned = new StringBuilder();
            for (String line : lines) {
                String trimmedLine = line.trim();
                // Skip empty lines and comment lines
                if (!trimmedLine.isEmpty() && !trimmedLine.startsWith("//") && !trimmedLine.startsWith("#")) {
                    cleaned.append(trimmedLine).append(" ");
                }
            }
            String normalizedQuery = cleaned.toString().trim();
            
            // Simple query parsing - real implementation would need a proper parser
            if (normalizedQuery.startsWith("db.") || normalizedQuery.startsWith("use ")) {
                return executeMongoCommand(database, normalizedQuery, request.getLimit());
            } else {
                return QueryResult.builder()
                    .success(false)
                    .error("Query must start with 'db.' (e.g., db.users.insertOne({name: 'John'}))")
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

    private String preprocessMongoQuery(String query) {
        // Replace ObjectId("...") with proper BSON ObjectId syntax
        // Pattern: ObjectId("hexstring") -> {"$oid": "hexstring"}
        return query.replaceAll("ObjectId\\\\(\\\"([a-f0-9]{24})\\\"\\\\)", "{\\\"\\\\$oid\\\": \\\"$1\\\"}");
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
            } else if (operation.startsWith("drop()")) {
                return executeDropCollection(collection, collectionName, startTime);
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
        
        log.info("MongoDB find query returned {} documents with columns: {}", rows.size(), columns);
        
        return QueryResult.builder()
            .success(true)
            .queryType("FIND")
            .columns(columns)
            .rows(rows)
            .rowCount(rows.size())
            .executionTimeMs(System.currentTimeMillis() - startTime)
            .message(rows.size() + " document(s) found")
            .build();
    }

    private QueryResult executeInsertQuery(MongoCollection<Document> collection, String operation, long startTime) {
        try {
            // Parse the document from insertOne({...}) or insertMany([{...}])
            int startIdx = operation.indexOf('(');
            int endIdx = operation.lastIndexOf(')');
            
            if (startIdx == -1 || endIdx == -1) {
                return QueryResult.builder()
                    .success(false)
                    .error("Invalid insert syntax")
                    .executionTimeMs(System.currentTimeMillis() - startTime)
                    .build();
            }
            
            String jsonContent = operation.substring(startIdx + 1, endIdx).trim();
            
            if (operation.startsWith("insertOne")) {
                // Parse single document
                Document doc = Document.parse(jsonContent);
                collection.insertOne(doc);
                
                return QueryResult.builder()
                    .success(true)
                    .queryType("INSERT")
                    .affectedRows(1)
                    .executionTimeMs(System.currentTimeMillis() - startTime)
                    .message("Document inserted successfully")
                    .build();
                    
            } else if (operation.startsWith("insertMany")) {
                // Parse array of documents
                // Remove outer brackets if present
                if (jsonContent.startsWith("[") && jsonContent.endsWith("]")) {
                    jsonContent = jsonContent.substring(1, jsonContent.length() - 1);
                }
                
                // Split by document boundaries (simplified - assumes well-formed JSON)
                List<Document> documents = new ArrayList<>();
                String[] docStrings = jsonContent.split("(?<=\\}),\\s*(?=\\{)");
                for (String docStr : docStrings) {
                    documents.add(Document.parse(docStr.trim()));
                }
                
                collection.insertMany(documents);
                
                return QueryResult.builder()
                    .success(true)
                    .queryType("INSERT")
                    .affectedRows(documents.size())
                    .executionTimeMs(System.currentTimeMillis() - startTime)
                    .message(documents.size() + " document(s) inserted successfully")
                    .build();
            }
            
            return QueryResult.builder()
                .success(false)
                .error("Unknown insert operation")
                .executionTimeMs(System.currentTimeMillis() - startTime)
                .build();
                
        } catch (Exception e) {
            log.error("Insert operation failed: {}", e.getMessage());
            return QueryResult.builder()
                .success(false)
                .error("Insert failed: " + e.getMessage())
                .executionTimeMs(System.currentTimeMillis() - startTime)
                .build();
        }
    }

    private QueryResult executeUpdateQuery(MongoCollection<Document> collection, String operation, long startTime) {
        try {
            // Parse updateOne({filter}, {update}) or updateMany({filter}, {update})
            int startIdx = operation.indexOf('(');
            int endIdx = operation.lastIndexOf(')');
            
            if (startIdx == -1 || endIdx == -1) {
                return QueryResult.builder()
                    .success(false)
                    .error("Invalid update syntax")
                    .executionTimeMs(System.currentTimeMillis() - startTime)
                    .build();
            }
            
            String params = operation.substring(startIdx + 1, endIdx).trim();
            
            // Split filter and update - find the boundary between two JSON objects
            int braceCount = 0;
            int splitIndex = -1;
            for (int i = 0; i < params.length(); i++) {
                char c = params.charAt(i);
                if (c == '{') braceCount++;
                else if (c == '}') {
                    braceCount--;
                    if (braceCount == 0 && i < params.length() - 1) {
                        splitIndex = i + 1;
                        break;
                    }
                }
            }
            
            if (splitIndex == -1) {
                return QueryResult.builder()
                    .success(false)
                    .error("Invalid update syntax: expected {filter}, {update}")
                    .executionTimeMs(System.currentTimeMillis() - startTime)
                    .build();
            }
            
            String filterJson = params.substring(0, splitIndex).trim();
            String updateJson = params.substring(splitIndex).trim();
            if (updateJson.startsWith(",")) updateJson = updateJson.substring(1).trim();
            
            // Preprocess to handle ObjectId() syntax
            filterJson = preprocessMongoQuery(filterJson);
            updateJson = preprocessMongoQuery(updateJson);
            
            Document filter = Document.parse(filterJson);
            Document update = Document.parse(updateJson);
            
            long modifiedCount;
            if (operation.startsWith("updateOne")) {
                modifiedCount = collection.updateOne(filter, update).getModifiedCount();
            } else if (operation.startsWith("updateMany")) {
                modifiedCount = collection.updateMany(filter, update).getModifiedCount();
            } else {
                return QueryResult.builder()
                    .success(false)
                    .error("Unknown update operation")
                    .executionTimeMs(System.currentTimeMillis() - startTime)
                    .build();
            }
            
            return QueryResult.builder()
                .success(true)
                .queryType("UPDATE")
                .affectedRows((int) modifiedCount)
                .executionTimeMs(System.currentTimeMillis() - startTime)
                .message(modifiedCount + " document(s) updated successfully")
                .build();
                
        } catch (Exception e) {
            log.error("Update operation failed: {}", e.getMessage());
            return QueryResult.builder()
                .success(false)
                .error("Update failed: " + e.getMessage())
                .executionTimeMs(System.currentTimeMillis() - startTime)
                .build();
        }
    }

    private QueryResult executeDeleteQuery(MongoCollection<Document> collection, String operation, long startTime) {
        try {
            // Parse deleteOne({filter}) or deleteMany({filter})
            int startIdx = operation.indexOf('(');
            int endIdx = operation.lastIndexOf(')');
            
            if (startIdx == -1 || endIdx == -1) {
                return QueryResult.builder()
                    .success(false)
                    .error("Invalid delete syntax")
                    .executionTimeMs(System.currentTimeMillis() - startTime)
                    .build();
            }
            
            String filterJson = operation.substring(startIdx + 1, endIdx).trim();
            // Preprocess to handle ObjectId() syntax
            filterJson = preprocessMongoQuery(filterJson);
            Document filter = Document.parse(filterJson);
            
            long deletedCount;
            if (operation.startsWith("deleteOne")) {
                deletedCount = collection.deleteOne(filter).getDeletedCount();
            } else if (operation.startsWith("deleteMany")) {
                deletedCount = collection.deleteMany(filter).getDeletedCount();
            } else {
                return QueryResult.builder()
                    .success(false)
                    .error("Unknown delete operation")
                    .executionTimeMs(System.currentTimeMillis() - startTime)
                    .build();
            }
            
            return QueryResult.builder()
                .success(true)
                .queryType("DELETE")
                .affectedRows((int) deletedCount)
                .executionTimeMs(System.currentTimeMillis() - startTime)
                .message(deletedCount + " document(s) deleted successfully")
                .build();
                
        } catch (Exception e) {
            log.error("Delete operation failed: {}", e.getMessage());
            return QueryResult.builder()
                .success(false)
                .error("Delete failed: " + e.getMessage())
                .executionTimeMs(System.currentTimeMillis() - startTime)
                .build();
        }
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

    private QueryResult executeDropCollection(MongoCollection<Document> collection, String collectionName, long startTime) {
        try {
            collection.drop();
            
            return QueryResult.builder()
                .success(true)
                .queryType("DROP")
                .affectedRows(0)
                .executionTimeMs(System.currentTimeMillis() - startTime)
                .message("Collection '" + collectionName + "' dropped successfully")
                .build();
        } catch (Exception e) {
            log.error("Drop collection failed: {}", e.getMessage());
            return QueryResult.builder()
                .success(false)
                .error("Drop failed: " + e.getMessage())
                .executionTimeMs(System.currentTimeMillis() - startTime)
                .build();
        }
    }

    public List<SchemaInfo.TableInfo> getCollectionsWithSchema(DatabaseInstance instance) {
        String host = "localhost";
        String connectionString = String.format("mongodb://%s:%s@%s:%d/%s?authSource=admin",
            instance.getUsername(),
            instance.getPassword(),
            host,
            instance.getPort(),
            instance.getDatabaseName()
        );

        try (MongoClient mongoClient = MongoClients.create(connectionString)) {
            MongoDatabase database = mongoClient.getDatabase(instance.getDatabaseName());
            List<SchemaInfo.TableInfo> tables = new ArrayList<>();
            
            for (String collectionName : database.listCollectionNames()) {
                MongoCollection<Document> collection = database.getCollection(collectionName);
                long count = collection.countDocuments();
                
                List<SchemaInfo.ColumnInfo> columns = new ArrayList<>();
                Document sample = collection.find().first();
                
                if (sample != null) {
                    for (String key : sample.keySet()) {
                        Object value = sample.get(key);
                        String type = value != null ? value.getClass().getSimpleName() : "Object";
                        if (value instanceof org.bson.types.ObjectId) type = "ObjectId";
                        
                        columns.add(SchemaInfo.ColumnInfo.builder()
                            .name(key)
                            .dataType(type)
                            .build());
                    }
                }
                
                tables.add(SchemaInfo.TableInfo.builder()
                    .name(collectionName)
                    .type("COLLECTION")
                    .rowCount(count)
                    .columns(columns)
                    .indexes(new ArrayList<>())
                    .build());
            }
            return tables;
        } catch (Exception e) {
            log.error("Failed to get MongoDB schema: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    public List<String> getCollections(DatabaseInstance instance) {
        // Use localhost since backend runs on same server as Docker containers
        String host = "localhost";
        
        // MongoDB root user is created in 'admin' database, so authenticate there
        String connectionString = String.format("mongodb://%s:%s@%s:%d/%s?authSource=admin",
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
