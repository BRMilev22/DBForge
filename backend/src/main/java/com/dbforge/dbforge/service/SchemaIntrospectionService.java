package com.dbforge.dbforge.service;

import com.dbforge.dbforge.dto.SchemaInfo;
import com.dbforge.dbforge.model.DatabaseInstance;
import com.dbforge.dbforge.repository.DatabaseInstanceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.sql.*;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class SchemaIntrospectionService {
    
    private final DatabaseInstanceRepository databaseInstanceRepository;
    private final MongoDBQueryService mongoDBQueryService;
    private final RedisQueryService redisQueryService;
    
    public SchemaInfo getSchema(Long instanceId) {
        DatabaseInstance instance = databaseInstanceRepository.findById(instanceId)
            .orElseThrow(() -> new RuntimeException("Database instance not found"));
            
        if (instance.getStatus() != DatabaseInstance.InstanceStatus.RUNNING) {
            throw new RuntimeException("Database instance is not running");
        }
        
        String dbType = instance.getDatabaseType().getName().toLowerCase();
        
        // Handle NoSQL databases differently
        if (dbType.equals("redis")) {
            return getRedisSchema(instance);
        } else if (dbType.equals("mongodb")) {
            return getMongoDBSchema(instance);
        }
        
        // Handle SQL databases with JDBC
        String jdbcUrl = buildJdbcUrl(instance);
        String username = instance.getUsername();
        String password = instance.getPassword();
        String database = instance.getDatabaseName();
        
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password)) {
            DatabaseMetaData metaData = conn.getMetaData();
            List<SchemaInfo.TableInfo> tables = new ArrayList<>();
            
            // For PostgreSQL, use the 'public' schema; for MySQL/MariaDB, use the database name
            String schemaPattern = dbType.equals("postgresql") ? "public" : null;
            String catalog = dbType.equals("postgresql") ? database : database;
            
            // Get all tables
            ResultSet tablesRs = metaData.getTables(catalog, schemaPattern, "%", new String[]{"TABLE", "VIEW"});
            while (tablesRs.next()) {
                String tableName = tablesRs.getString("TABLE_NAME");
                String tableType = tablesRs.getString("TABLE_TYPE");
                String tableSchema = tablesRs.getString("TABLE_SCHEM");
                
                // Skip system tables for PostgreSQL
                if (dbType.equals("postgresql") && tableSchema != null && !tableSchema.equals("public")) {
                    continue;
                }
                
                // Get columns for this table
                List<SchemaInfo.ColumnInfo> columns = getColumns(metaData, catalog, schemaPattern, tableName, dbType);
                
                // Get indexes for this table
                List<SchemaInfo.IndexInfo> indexes = getIndexes(metaData, catalog, schemaPattern, tableName);
                
                // Get row count
                Long rowCount = getRowCount(conn, tableName, tableSchema);
                
                tables.add(SchemaInfo.TableInfo.builder()
                    .name(tableName)
                    .type(tableType)
                    .rowCount(rowCount)
                    .columns(columns)
                    .indexes(indexes)
                    .build());
            }
            
            return SchemaInfo.builder()
                .databaseName(database)
                .tables(tables)
                .build();
                
        } catch (SQLException e) {
            log.error("Schema introspection error: {}", e.getMessage());
            throw new RuntimeException("Failed to introspect schema: " + e.getMessage());
        }
    }
    
    private List<SchemaInfo.ColumnInfo> getColumns(DatabaseMetaData metaData, String catalog, String schemaPattern, String tableName, String dbType) throws SQLException {
        List<SchemaInfo.ColumnInfo> columns = new ArrayList<>();
        
        // Get primary keys
        Set<String> primaryKeys = new HashSet<>();
        ResultSet pkRs = metaData.getPrimaryKeys(catalog, schemaPattern, tableName);
        while (pkRs.next()) {
            primaryKeys.add(pkRs.getString("COLUMN_NAME"));
        }
        
        // Get columns
        ResultSet columnsRs = metaData.getColumns(catalog, schemaPattern, tableName, "%");
        while (columnsRs.next()) {
            String columnName = columnsRs.getString("COLUMN_NAME");
            String dataType = columnsRs.getString("TYPE_NAME");
            int nullable = columnsRs.getInt("NULLABLE");
            String defaultValue = columnsRs.getString("COLUMN_DEF");
            String isAutoIncrement = columnsRs.getString("IS_AUTOINCREMENT");
            int columnSize = columnsRs.getInt("COLUMN_SIZE");
            
            columns.add(SchemaInfo.ColumnInfo.builder()
                .name(columnName)
                .dataType(dataType)
                .nullable(nullable == DatabaseMetaData.columnNullable)
                .defaultValue(defaultValue)
                .primaryKey(primaryKeys.contains(columnName))
                .autoIncrement("YES".equalsIgnoreCase(isAutoIncrement))
                .maxLength(columnSize)
                .build());
        }
        
        return columns;
    }
    
    private List<SchemaInfo.IndexInfo> getIndexes(DatabaseMetaData metaData, String catalog, String schemaPattern, String tableName) throws SQLException {
        List<SchemaInfo.IndexInfo> indexes = new ArrayList<>();
        Map<String, SchemaInfo.IndexInfo> indexMap = new LinkedHashMap<>();
        
        ResultSet indexRs = metaData.getIndexInfo(catalog, schemaPattern, tableName, false, false);
        while (indexRs.next()) {
            String indexName = indexRs.getString("INDEX_NAME");
            if (indexName == null) continue;
            
            boolean nonUnique = indexRs.getBoolean("NON_UNIQUE");
            String columnName = indexRs.getString("COLUMN_NAME");
            
            String indexType = "INDEX";
            if ("PRIMARY".equals(indexName) || indexName.endsWith("_pkey")) {
                indexType = "PRIMARY";
            } else if (!nonUnique) {
                indexType = "UNIQUE";
            }
            
            SchemaInfo.IndexInfo indexInfo = indexMap.get(indexName);
            if (indexInfo == null) {
                indexInfo = SchemaInfo.IndexInfo.builder()
                    .name(indexName)
                    .type(indexType)
                    .columns(new ArrayList<>())
                    .build();
                indexMap.put(indexName, indexInfo);
            }
            indexInfo.getColumns().add(columnName);
        }
        
        indexes.addAll(indexMap.values());
        return indexes;
    }
    
    private Long getRowCount(Connection conn, String tableName, String schema) {
        try (Statement stmt = conn.createStatement()) {
            String query = schema != null && !schema.isEmpty() 
                ? String.format("SELECT COUNT(*) FROM \"%s\".\"%s\"", schema, tableName)
                : String.format("SELECT COUNT(*) FROM `%s`", tableName);
            ResultSet rs = stmt.executeQuery(query);
            if (rs.next()) {
                return rs.getLong(1);
            }
        } catch (SQLException e) {
            log.warn("Failed to get row count for table {}: {}", tableName, e.getMessage());
        }
        return null;
    }
    
    private String buildJdbcUrl(DatabaseInstance instance) {
        String host = instance.getHost();
        String port = String.valueOf(instance.getPort());
        String database = instance.getDatabaseName();
        String dbType = instance.getDatabaseType().getName().toLowerCase();
        
        switch (dbType) {
            case "postgresql":
                return String.format("jdbc:postgresql://%s:%s/%s", host, port, database);
            case "mysql":
            case "mariadb":
                return String.format("jdbc:mysql://%s:%s/%s?allowPublicKeyRetrieval=true&useSSL=false", host, port, database);
            default:
                throw new RuntimeException("Unsupported database type: " + dbType);
        }
    }
    
    private SchemaInfo getRedisSchema(DatabaseInstance instance) {
        try {
            List<String> keys = redisQueryService.getKeys(instance);
            List<SchemaInfo.TableInfo> tables = new ArrayList<>();
            
            // Group keys by pattern (e.g., "user:1:name" -> "user")
            Map<String, Integer> keyPrefixes = new LinkedHashMap<>();
            for (String key : keys) {
                String prefix = key.contains(":") ? key.substring(0, key.indexOf(":")) : key;
                keyPrefixes.put(prefix, keyPrefixes.getOrDefault(prefix, 0) + 1);
            }
            
            // Create a "table" for each key prefix
            for (Map.Entry<String, Integer> entry : keyPrefixes.entrySet()) {
                tables.add(SchemaInfo.TableInfo.builder()
                    .name(entry.getKey() + ":*")
                    .type("KEY PATTERN")
                    .rowCount(entry.getValue().longValue())
                    .columns(new ArrayList<>())
                    .indexes(new ArrayList<>())
                    .build());
            }
            
            return SchemaInfo.builder()
                .databaseName("Redis Key-Value Store")
                .tables(tables)
                .build();
        } catch (Exception e) {
            log.error("Failed to get Redis keys: {}", e.getMessage());
            return SchemaInfo.builder()
                .databaseName("Redis Key-Value Store")
                .tables(new ArrayList<>())
                .build();
        }
    }
    
    private SchemaInfo getMongoDBSchema(DatabaseInstance instance) {
        try {
            List<String> collections = mongoDBQueryService.getCollections(instance);
            List<SchemaInfo.TableInfo> tables = new ArrayList<>();
            
            for (String collectionName : collections) {
                tables.add(SchemaInfo.TableInfo.builder()
                    .name(collectionName)
                    .type("COLLECTION")
                    .rowCount(null)
                    .columns(new ArrayList<>())
                    .indexes(new ArrayList<>())
                    .build());
            }
            
            return SchemaInfo.builder()
                .databaseName(instance.getDatabaseName())
                .tables(tables)
                .build();
        } catch (Exception e) {
            log.error("Failed to get MongoDB collections: {}", e.getMessage());
            return SchemaInfo.builder()
                .databaseName(instance.getDatabaseName())
                .tables(new ArrayList<>())
                .build();
        }
    }
}
