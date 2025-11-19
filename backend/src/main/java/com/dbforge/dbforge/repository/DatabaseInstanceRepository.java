package com.dbforge.dbforge.repository;

import com.dbforge.dbforge.model.DatabaseInstance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DatabaseInstanceRepository extends JpaRepository<DatabaseInstance, Long> {
    List<DatabaseInstance> findByUserIdAndStatusNot(Long userId, DatabaseInstance.InstanceStatus status);
    
    @Query("SELECT COUNT(d) FROM DatabaseInstance d WHERE d.status = 'RUNNING'")
    long countRunningInstances();
    
    @Query("SELECT d.port FROM DatabaseInstance d WHERE d.databaseType.id = ?1")
    List<Integer> findAllocatedPortsByDatabaseTypeId(Long databaseTypeId);
}
