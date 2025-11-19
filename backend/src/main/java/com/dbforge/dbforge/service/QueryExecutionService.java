package com.dbforge.dbforge.service;

import com.dbforge.dbforge.dto.QueryRequest;
import com.dbforge.dbforge.dto.QueryResult;
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
public class QueryExecutionService {
    
    private final DatabaseInstanceRepository databaseInstanceRepository;
    
    public QueryResult executeQuery(Long instanceId, QueryRequest request) {
        long startTime = System.currentTimeMillis();
        
        DatabaseInstance instance = databaseInstanceRepository.findById(instanceId)
            .orElseThrow(() -> new RuntimeException("Database instance not found"));
            
        if (instance.getStatus() != DatabaseInstance.InstanceStatus.RUNNING) {
            return QueryResult.builder()
                .success(false)
                .error("Database instance is not running")
                .build();
        }
        
        String jdbcUrl = buildJdbcUrl(instance);
        String username = instance.getUsername();
        String password = instance.getPassword();
        
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password)) {
            // Set timeout if provided
            if (request.getTimeout() != null) {
                conn.setNetworkTimeout(null, request.getTimeout() * 1000);
            }
            
            String queryType = determineQueryType(request.getQuery());
            
            if ("SELECT".equals(queryType)) {
                return executeSelectQuery(conn, request);
            } else {
                return executeUpdateQuery(conn, request, queryType);
            }
            
        } catch (SQLException e) {
            log.error("Query execution error: {}", e.getMessage());
            long executionTime = System.currentTimeMillis() - startTime;
            return QueryResult.builder()
                .success(false)
                .error(e.getMessage())
                .executionTimeMs(executionTime)
                .build();
        }
    }
    
    private QueryResult executeSelectQuery(Connection conn, QueryRequest request) throws SQLException {
        long startTime = System.currentTimeMillis();
        
        try (Statement stmt = conn.createStatement()) {
            // Apply limit if provided
            String query = request.getQuery().trim();
            if (request.getLimit() != null && !query.toLowerCase().contains("limit")) {
                query += " LIMIT " + request.getLimit();
            }
            
            ResultSet rs = stmt.executeQuery(query);
            ResultSetMetaData metaData = rs.getMetaData();
            int columnCount = metaData.getColumnCount();
            
            // Extract column names
            List<String> columns = new ArrayList<>();
            for (int i = 1; i <= columnCount; i++) {
                columns.add(metaData.getColumnName(i));
            }
            
            // Extract rows
            List<Map<String, Object>> rows = new ArrayList<>();
            int rowCount = 0;
            while (rs.next()) {
                Map<String, Object> row = new LinkedHashMap<>();
                for (int i = 1; i <= columnCount; i++) {
                    String columnName = metaData.getColumnName(i);
                    Object value = rs.getObject(i);
                    row.put(columnName, value);
                }
                rows.add(row);
                rowCount++;
                
                // Safety limit to prevent memory issues
                if (rowCount >= 10000) {
                    break;
                }
            }
            
            long executionTime = System.currentTimeMillis() - startTime;
            
            return QueryResult.builder()
                .success(true)
                .queryType("SELECT")
                .columns(columns)
                .rows(rows)
                .rowCount(rowCount)
                .executionTimeMs(executionTime)
                .message("Query executed successfully")
                .build();
        }
    }
    
    private QueryResult executeUpdateQuery(Connection conn, QueryRequest request, String queryType) throws SQLException {
        long startTime = System.currentTimeMillis();
        
        try (Statement stmt = conn.createStatement()) {
            int affectedRows = stmt.executeUpdate(request.getQuery());
            long executionTime = System.currentTimeMillis() - startTime;
            
            return QueryResult.builder()
                .success(true)
                .queryType(queryType)
                .affectedRows(affectedRows)
                .executionTimeMs(executionTime)
                .message(affectedRows + " row(s) affected")
                .build();
        }
    }
    
    private String determineQueryType(String query) {
        // Remove leading whitespace and comments, then check query type
        String[] lines = query.split("\\n");
        StringBuilder cleaned = new StringBuilder();
        
        for (String line : lines) {
            String trimmedLine = line.trim();
            // Skip empty lines and comment lines
            if (!trimmedLine.isEmpty() && !trimmedLine.startsWith("--")) {
                cleaned.append(trimmedLine).append(" ");
            }
        }
        
        String normalized = cleaned.toString().trim().toUpperCase();
        
        if (normalized.startsWith("SELECT")) return "SELECT";
        if (normalized.startsWith("INSERT")) return "INSERT";
        if (normalized.startsWith("UPDATE")) return "UPDATE";
        if (normalized.startsWith("DELETE")) return "DELETE";
        if (normalized.startsWith("CREATE")) return "CREATE";
        if (normalized.startsWith("ALTER")) return "ALTER";
        if (normalized.startsWith("DROP")) return "DROP";
        if (normalized.startsWith("TRUNCATE")) return "TRUNCATE";
        return "OTHER";
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
            case "mongodb":
                return String.format("mongodb://%s:%s/%s", host, port, database);
            default:
                throw new RuntimeException("Unsupported database type: " + dbType);
        }
    }
}
