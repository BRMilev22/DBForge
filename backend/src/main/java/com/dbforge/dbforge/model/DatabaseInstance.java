package com.dbforge.dbforge.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "database_instances")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatabaseInstance {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @ManyToOne
    @JoinColumn(name = "database_type_id", nullable = false)
    private DatabaseType databaseType;
    
    @Column(name = "database_version_id")
    private Long databaseVersionId;
    
    @Column(name = "instance_name", nullable = false)
    private String instanceName;
    
    @Column(name = "container_id")
    private String containerId;
    
    @Column(name = "container_name", nullable = false, unique = true)
    private String containerName;
    
    private String host;
    
    @Column(nullable = false)
    private Integer port;
    
    @Column(name = "database_name", nullable = false)
    private String databaseName;
    
    @Column(nullable = false)
    private String username;
    
    @Column(nullable = false)
    private String password;
    
    @Column(name = "cpu_limit")
    private String cpuLimit = "0.25";
    
    @Column(name = "memory_limit")
    private String memoryLimit = "256m";
    
    @Column(name = "storage_limit")
    private String storageLimit = "1g";
    
    @Enumerated(EnumType.STRING)
    private InstanceStatus status = InstanceStatus.CREATING;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(name = "started_at")
    private LocalDateTime startedAt;
    
    public enum InstanceStatus {
        CREATING, RUNNING, STOPPED, ERROR, DELETED
    }
}
