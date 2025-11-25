package com.dbforge.dbforge.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id")
    private Long userId;
    
    @Column(nullable = false, length = 100)
    private String action;
    
    @Column(name = "resource_type", length = 50)
    private String resourceType;
    
    @Column(name = "resource_id")
    private Long resourceId;
    
    @Column(name = "resource_name")
    private String resourceName;
    
    @Column(name = "ip_address", length = 45)
    private String ipAddress;
    
    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.SUCCESS;
    
    @Column(columnDefinition = "TEXT")
    private String details;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
    
    public enum Status {
        SUCCESS,
        FAILURE,
        PENDING
    }
    
    public enum Action {
        DATABASE_CREATED("Database Created"),
        DATABASE_STARTED("Database Started"),
        DATABASE_STOPPED("Database Stopped"),
        DATABASE_DELETED("Database Deleted"),
        QUERY_EXECUTED("Query Executed"),
        DATA_INSERTED("Data Inserted"),
        DATA_UPDATED("Data Updated"),
        DATA_DELETED("Data Deleted"),
        SCHEMA_CREATED("Schema Created"),
        SCHEMA_ALTERED("Schema Altered"),
        SCHEMA_DROPPED("Schema Dropped"),
        TABLE_TRUNCATED("Table Truncated"),
        SCHEMA_VIEWED("Schema Viewed"),
        DATA_EXPORTED("Data Exported"),
        DATA_IMPORTED("Data Imported"),
        API_TOKEN_GENERATED("API Token Generated"),
        USER_LOGIN("User Login"),
        USER_LOGOUT("User Logout"),
        USER_REGISTERED("User Registered"),
        CONNECTION_OPENED("Connection Opened");
        
        private final String displayName;
        
        Action(String displayName) {
            this.displayName = displayName;
        }
        
        public String getDisplayName() {
            return displayName;
        }
    }
}
