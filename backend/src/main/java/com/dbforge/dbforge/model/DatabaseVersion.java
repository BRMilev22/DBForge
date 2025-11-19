package com.dbforge.dbforge.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "database_versions")
@Data
public class DatabaseVersion {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "database_type_id", nullable = false)
    private Long databaseTypeId;
    
    @Column(nullable = false, length = 50)
    private String version;
    
    @Column(name = "docker_tag", nullable = false, length = 100)
    private String dockerTag;
    
    @Column(name = "is_default")
    private Boolean isDefault = false;
    
    @Column(name = "is_active")
    private Boolean isActive = true;
    
    @Column(name = "release_date")
    private LocalDate releaseDate;
    
    @Column(name = "end_of_life_date")
    private LocalDate endOfLifeDate;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
