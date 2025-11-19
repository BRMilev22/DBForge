package com.dbforge.dbforge.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "database_types")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatabaseType {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String name;
    
    @Column(name = "display_name", nullable = false)
    private String displayName;
    
    private String description;
    
    @Column(name = "docker_image", nullable = false)
    private String dockerImage;
    
    @Column(name = "default_port", nullable = false)
    private Integer defaultPort;
    
    @Column(name = "is_active")
    private Boolean isActive = true;
    
    @Enumerated(EnumType.STRING)
    private DatabaseCategory category = DatabaseCategory.SQL;
    
    public enum DatabaseCategory {
        SQL, NOSQL, CACHE, OTHER
    }
}
