package com.dbforge.dbforge.dto;

import com.dbforge.dbforge.model.DatabaseInstance;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatabaseResponse {
    private Long id;
    private String instanceName;
    private String databaseType;
    private String status;
    private String apiToken;
    private ConnectionInfo connectionInfo;
    private Long storage;  // Disk storage in MB
    private Long memoryUsage;  // RAM usage in MB
    private LocalDateTime createdAt;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConnectionInfo {
        private String host;
        private Integer port;
        private String database;
        private String username;
        private String password;
        private String connectionString;
    }
    
    public static DatabaseResponse from(DatabaseInstance instance) {
        DatabaseResponse response = new DatabaseResponse();
        response.setId(instance.getId());
        response.setInstanceName(instance.getInstanceName());
        response.setDatabaseType(instance.getDatabaseType().getName());
        response.setStatus(instance.getStatus().name());
        
        ConnectionInfo connInfo = new ConnectionInfo();
        connInfo.setHost(instance.getHost());
        connInfo.setPort(instance.getPort());
        connInfo.setDatabase(instance.getDatabaseName());
        connInfo.setUsername(instance.getUsername());
        connInfo.setPassword(instance.getPassword());
        connInfo.setConnectionString(buildConnectionString(instance));
        
        response.setConnectionInfo(connInfo);
        response.setApiToken(instance.getApiToken());
        response.setStorage(instance.getStorage() != null ? instance.getStorage() : 0L);
        response.setMemoryUsage(instance.getMemoryUsage() != null ? instance.getMemoryUsage() : 0L);
        response.setCreatedAt(instance.getCreatedAt());
        return response;
    }
    
    private static String buildConnectionString(DatabaseInstance instance) {
        String dbType = instance.getDatabaseType().getName().toLowerCase();
        return switch (dbType) {
            case "postgresql" -> String.format("postgresql://%s:%s@%s:%d/%s",
                    instance.getUsername(), instance.getPassword(),
                    instance.getHost(), instance.getPort(), instance.getDatabaseName());
            case "mysql", "mariadb" -> String.format("mysql://%s:%s@%s:%d/%s",
                    instance.getUsername(), instance.getPassword(),
                    instance.getHost(), instance.getPort(), instance.getDatabaseName());
            case "mongodb" -> String.format("mongodb://%s:%s@%s:%d/%s",
                    instance.getUsername(), instance.getPassword(),
                    instance.getHost(), instance.getPort(), instance.getDatabaseName());
            case "redis" -> String.format("redis://:%s@%s:%d",
                    instance.getPassword(), instance.getHost(), instance.getPort());
            default -> "";
        };
    }
}
