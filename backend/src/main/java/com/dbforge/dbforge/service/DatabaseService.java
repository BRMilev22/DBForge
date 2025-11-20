package com.dbforge.dbforge.service;

import com.dbforge.dbforge.model.DatabaseInstance;
import com.dbforge.dbforge.model.DatabaseType;
import com.dbforge.dbforge.model.DatabaseVersion;
import com.dbforge.dbforge.repository.DatabaseInstanceRepository;
import com.dbforge.dbforge.repository.DatabaseTypeRepository;
import com.dbforge.dbforge.repository.DatabaseVersionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.ServerSocket;
import java.security.SecureRandom;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class DatabaseService {
    
    private final DatabaseInstanceRepository instanceRepository;
    private final DatabaseTypeRepository typeRepository;
    private final DatabaseVersionRepository versionRepository;
    private final DockerService dockerService;
    private final ApiTokenService apiTokenService;
    
    @Value("${port.postgres.start:5432}")
    private int postgresStart;
    @Value("${port.postgres.end:5531}")
    private int postgresEnd;
    
    @Value("${port.mysql.start:3306}")
    private int mysqlStart;
    @Value("${port.mysql.end:3405}")
    private int mysqlEnd;
    
    @Value("${port.mariadb.start:3406}")
    private int mariadbStart;
    @Value("${port.mariadb.end:3505}")
    private int mariadbEnd;
    
    @Value("${port.mongodb.start:27017}")
    private int mongodbStart;
    @Value("${port.mongodb.end:27116}")
    private int mongodbEnd;
    
    @Value("${port.redis.start:6379}")
    private int redisStart;
    @Value("${port.redis.end:6478}")
    private int redisEnd;
    
    @Value("${resource.max.active.instances:8}")
    private int maxActiveInstances;
    
    @Value("${app.database.host:localhost}")
    private String databaseHost;
    
    @Transactional
    public DatabaseInstance createDatabase(Long userId, String databaseTypeName, String instanceName, String dbUsername, String dbPassword) {
        long runningCount = instanceRepository.countRunningInstances();
        if (runningCount >= maxActiveInstances) {
            throw new RuntimeException("Maximum number of active instances reached (" + maxActiveInstances + ")");
        }
        
        DatabaseType dbType = typeRepository.findByName(databaseTypeName)
                .orElseThrow(() -> new RuntimeException("Database type not found: " + databaseTypeName));
        
        DatabaseVersion dbVersion = versionRepository.findByDatabaseTypeIdAndIsDefaultTrue(dbType.getId())
                .orElseThrow(() -> new RuntimeException("No default version found for database type: " + databaseTypeName));
        
        String fullImageName = dbType.getDockerImage() + ":" + dbVersion.getDockerTag();
        
        int port = allocatePort(dbType);
        
        // Use provided credentials or generate defaults
        String username = (dbUsername != null && !dbUsername.trim().isEmpty()) 
            ? dbUsername.trim() 
            : "user_" + userId + "_" + System.currentTimeMillis();
        String password = (dbPassword != null && !dbPassword.trim().isEmpty()) 
            ? dbPassword 
            : generateSecurePassword();
        String databaseName = sanitizeName(instanceName);
        String containerName = String.format("dbforge_%d_%s_%s", userId, databaseTypeName, databaseName);
        
        DatabaseInstance instance = new DatabaseInstance();
        instance.setUserId(userId);
        instance.setDatabaseType(dbType);
        instance.setDatabaseVersionId(dbVersion.getId());
        instance.setInstanceName(instanceName);
        instance.setContainerName(containerName);
        instance.setHost("localhost"); // Backend connects via localhost, frontend uses databaseHost
        instance.setPort(port);
        instance.setDatabaseName(databaseName);
        instance.setUsername(username);
        instance.setPassword(password);
        // generate an API token for this database instance (length between 30-40 chars)
        try {
            int tokenLength = 30 + new SecureRandom().nextInt(11); // 30..40 inclusive
            ApiTokenService.TokenGenerationResult tgr = apiTokenService.createApiTokenWithLength(
                    userId,
                    String.format("db-%d-%s", userId, databaseName),
                    null,
                    null,
                    tokenLength
            );
            instance.setApiToken(tgr.getRawToken());
        } catch (Exception e) {
            log.warn("Failed to create api token via ApiTokenService, falling back to local token: {}", e.getMessage());
            String apiToken = generateUniqueApiToken(35);
            instance.setApiToken(apiToken);
        }
        instance.setStatus(DatabaseInstance.InstanceStatus.CREATING);
        
        instance = instanceRepository.save(instance);
        
        try {
            String containerId = dockerService.createDatabase(instance, dbType, fullImageName);
            
            instance.setContainerId(containerId);
            instance.setStatus(DatabaseInstance.InstanceStatus.RUNNING);
            instance.setStartedAt(LocalDateTime.now());
            
            // Wait for database to be fully ready
            Thread.sleep(2000);
            
            // Initialize with default schema
            initializeDefaultSchema(instance);
            
            log.info("Database created successfully: {} (user: {})", instanceName, userId);
            
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Failed to create database container", e);
            instance.setStatus(DatabaseInstance.InstanceStatus.ERROR);
            throw new RuntimeException("Database creation interrupted: " + e.getMessage());
        } catch (Exception e) {
            log.error("Failed to create database container", e);
            instance.setStatus(DatabaseInstance.InstanceStatus.ERROR);
            throw new RuntimeException("Failed to create database: " + e.getMessage());
        }
        
        return instanceRepository.save(instance);
    }

    private String generateUniqueApiToken(int length) {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        SecureRandom random = new SecureRandom();
        String token;
        int attempts = 0;
        do {
            StringBuilder sb = new StringBuilder(length);
            for (int i = 0; i < length; i++) {
                sb.append(chars.charAt(random.nextInt(chars.length())));
            }
            token = sb.toString();
            attempts++;
            if (attempts > 10) {
                // fallback: include timestamp to reduce collisions
                token = token + System.currentTimeMillis();
            }
        } while (instanceRepository.existsByApiToken(token));
        return token;
    }
    
    private void initializeDefaultSchema(DatabaseInstance instance) {
        try {
            String jdbcUrl = buildJdbcUrl(instance);
            try (Connection conn = DriverManager.getConnection(jdbcUrl, instance.getUsername(), instance.getPassword())) {
                try (Statement stmt = conn.createStatement()) {
                    // Create a sample users table
                    String createTable = "CREATE TABLE IF NOT EXISTS users (" +
                        "id INT AUTO_INCREMENT PRIMARY KEY, " +
                        "username VARCHAR(100) NOT NULL, " +
                        "email VARCHAR(255) NOT NULL, " +
                        "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
                        ")";
                    stmt.execute(createTable);
                    log.info("Initialized default schema for database: {}", instance.getInstanceName());
                }
            }
        } catch (Exception e) {
            log.warn("Failed to initialize default schema (non-critical): {}", e.getMessage());
        }
    }
    
    private String buildJdbcUrl(DatabaseInstance instance) {
        String dbType = instance.getDatabaseType().getName().toLowerCase();
        switch (dbType) {
            case "mysql":
            case "mariadb":
                return String.format("jdbc:mysql://%s:%d/%s", 
                    instance.getHost(), instance.getPort(), instance.getDatabaseName());
            case "postgresql":
                return String.format("jdbc:postgresql://%s:%d/%s", 
                    instance.getHost(), instance.getPort(), instance.getDatabaseName());
            default:
                throw new RuntimeException("Unsupported database type: " + dbType);
        }
    }
    
    public List<DatabaseInstance> getUserDatabases(Long userId) {
        return instanceRepository.findByUserIdAndStatusNot(userId, DatabaseInstance.InstanceStatus.DELETED);
    }
    
    public DatabaseInstance getDatabaseById(Long id) {
        return instanceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Database not found"));
    }
    
    @Transactional
    public void deleteDatabase(Long id, Long userId) {
        DatabaseInstance instance = getDatabaseById(id);
        
        if (!instance.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }
        
        if (instance.getContainerId() != null) {
            try {
                dockerService.deleteContainer(instance.getContainerId());
            } catch (Exception e) {
                log.warn("Failed to delete Docker container, marking as deleted anyway: {}", e.getMessage());
            }
        }
        
        instance.setStatus(DatabaseInstance.InstanceStatus.DELETED);
        instanceRepository.save(instance);
        
        log.info("Database deleted: {} (user: {})", instance.getInstanceName(), userId);
    }
    
    @Transactional
    public void stopDatabase(Long id, Long userId) {
        DatabaseInstance instance = getDatabaseById(id);
        
        if (!instance.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }
        
        if (instance.getContainerId() != null) {
            dockerService.stopContainer(instance.getContainerId());
            instance.setStatus(DatabaseInstance.InstanceStatus.STOPPED);
            instanceRepository.save(instance);
        }
    }
    
    @Transactional
    public void startDatabase(Long id, Long userId) {
        DatabaseInstance instance = getDatabaseById(id);
        
        if (!instance.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }
        
        if (instance.getContainerId() != null) {
            dockerService.startContainer(instance.getContainerId());
            instance.setStatus(DatabaseInstance.InstanceStatus.RUNNING);
            instance.setStartedAt(LocalDateTime.now());
            instanceRepository.save(instance);
        }
    }

    @Transactional
    public String generateApiTokenForInstance(Long id, Long userId) {
        DatabaseInstance instance = getDatabaseById(id);
        if (!instance.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }

        // generate token with random length between 30 and 40
        int tokenLength = 30 + new SecureRandom().nextInt(11);
        ApiTokenService.TokenGenerationResult tgr = apiTokenService.createApiTokenWithLength(
                userId,
                String.format("db-%d-%s", userId, instance.getDatabaseName()),
                null,
                null,
                tokenLength
        );

        String token = tgr.getRawToken();
        instance.setApiToken(token);
        instanceRepository.save(instance);
        return token;
    }
    
    public List<DatabaseType> getAvailableDatabaseTypes() {
        return typeRepository.findByIsActiveTrue();
    }
    
    private int allocatePort(DatabaseType dbType) {
        List<Integer> allocatedPorts = instanceRepository.findAllocatedPortsByDatabaseTypeId(dbType.getId());
        
        int startPort = getStartPort(dbType.getName());
        int endPort = getEndPort(dbType.getName());
        
        for (int port = startPort; port <= endPort; port++) {
            if (!allocatedPorts.contains(port) && isPortAvailable(port)) {
                return port;
            }
        }
        
        throw new RuntimeException("No available ports for " + dbType.getName());
    }
    
    private boolean isPortAvailable(int port) {
        try (ServerSocket serverSocket = new ServerSocket(port)) {
            serverSocket.setReuseAddress(true);
            return true;
        } catch (IOException e) {
            return false;
        }
    }
    
    private int getStartPort(String dbTypeName) {
        return switch (dbTypeName.toLowerCase()) {
            case "postgresql" -> postgresStart;
            case "mysql" -> mysqlStart;
            case "mariadb" -> mariadbStart;
            case "mongodb" -> mongodbStart;
            case "redis" -> redisStart;
            default -> throw new RuntimeException("Unknown database type: " + dbTypeName);
        };
    }
    
    private int getEndPort(String dbTypeName) {
        return switch (dbTypeName.toLowerCase()) {
            case "postgresql" -> postgresEnd;
            case "mysql" -> mysqlEnd;
            case "mariadb" -> mariadbEnd;
            case "mongodb" -> mongodbEnd;
            case "redis" -> redisEnd;
            default -> throw new RuntimeException("Unknown database type: " + dbTypeName);
        };
    }
    
    private String generateSecurePassword() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        SecureRandom random = new SecureRandom();
        StringBuilder password = new StringBuilder(16);
        for (int i = 0; i < 16; i++) {
            password.append(chars.charAt(random.nextInt(chars.length())));
        }
        return password.toString();
    }
    
    private String sanitizeName(String name) {
        return name.toLowerCase()
                .replaceAll("[^a-z0-9_]", "_")
                .substring(0, Math.min(name.length(), 50));
    }
}
