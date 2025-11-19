package com.dbforge.dbforge.repository;

import com.dbforge.dbforge.model.DatabaseType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface DatabaseTypeRepository extends JpaRepository<DatabaseType, Long> {
    Optional<DatabaseType> findByName(String name);
    List<DatabaseType> findByIsActiveTrue();
}
