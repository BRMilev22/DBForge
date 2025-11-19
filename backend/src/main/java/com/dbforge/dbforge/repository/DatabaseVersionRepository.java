package com.dbforge.dbforge.repository;

import com.dbforge.dbforge.model.DatabaseVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DatabaseVersionRepository extends JpaRepository<DatabaseVersion, Long> {
    Optional<DatabaseVersion> findByDatabaseTypeIdAndIsDefaultTrue(Long databaseTypeId);
}
