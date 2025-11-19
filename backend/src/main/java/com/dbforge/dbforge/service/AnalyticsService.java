package com.dbforge.dbforge.service;

import com.dbforge.dbforge.dto.AnalyticsResponse;
import com.dbforge.dbforge.model.DatabaseInstance;
import com.dbforge.dbforge.repository.DatabaseInstanceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class AnalyticsService {
    
    private final DatabaseInstanceRepository instanceRepository;
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    
    public AnalyticsResponse getAnalytics(Long userId) {
        List<DatabaseInstance> databases = instanceRepository.findByUserIdAndStatusNot(userId, DatabaseInstance.InstanceStatus.DELETED);
        
        // Calculate metrics
        int totalDatabases = databases.size();
        int runningDatabases = (int) databases.stream()
                .filter(db -> db.getStatus() == DatabaseInstance.InstanceStatus.RUNNING)
                .count();
        int stoppedDatabases = (int) databases.stream()
                .filter(db -> db.getStatus() == DatabaseInstance.InstanceStatus.STOPPED)
                .count();
        
        // Calculate storage (mock: 256MB per database)
        long totalStorage = totalDatabases * 256L;
        
        // Calculate uptime (percentage of running databases)
        double uptime = totalDatabases > 0 
                ? (runningDatabases * 100.0 / totalDatabases) 
                : 100.0;
        
        AnalyticsResponse.MetricsData metrics = AnalyticsResponse.MetricsData.builder()
                .totalDatabases(totalDatabases)
                .runningDatabases(runningDatabases)
                .stoppedDatabases(stoppedDatabases)
                .totalStorage(totalStorage)
                .uptime(Math.round(uptime * 10.0) / 10.0)
                .build();
        
        // Group databases by type
        Map<String, Long> byTypeMap = databases.stream()
                .collect(Collectors.groupingBy(
                        db -> db.getDatabaseType().getDisplayName(),
                        Collectors.counting()
                ));
        
        AnalyticsResponse.ChartData databasesByType = AnalyticsResponse.ChartData.builder()
                .labels(new ArrayList<>(byTypeMap.keySet()))
                .values(byTypeMap.values().stream()
                        .map(Long::intValue)
                        .collect(Collectors.toList()))
                .build();
        
        // Group databases by status
        Map<String, Long> byStatusMap = databases.stream()
                .collect(Collectors.groupingBy(
                        db -> db.getStatus().toString(),
                        Collectors.counting()
                ));
        
        AnalyticsResponse.ChartData databasesByStatus = AnalyticsResponse.ChartData.builder()
                .labels(new ArrayList<>(byStatusMap.keySet()))
                .values(byStatusMap.values().stream()
                        .map(Long::intValue)
                        .collect(Collectors.toList()))
                .build();
        
        // Generate recent activity
        List<AnalyticsResponse.ActivityEvent> recentActivity = databases.stream()
                .sorted(Comparator.comparing(DatabaseInstance::getCreatedAt).reversed())
                .limit(10)
                .map(db -> AnalyticsResponse.ActivityEvent.builder()
                        .id(db.getId())
                        .databaseName(db.getInstanceName())
                        .databaseType(db.getDatabaseType().getDisplayName())
                        .action(db.getStatus() == DatabaseInstance.InstanceStatus.RUNNING ? "Started" : 
                                db.getStatus() == DatabaseInstance.InstanceStatus.STOPPED ? "Stopped" : "Created")
                        .status(db.getStatus().toString())
                        .timestamp(db.getStartedAt() != null 
                                ? db.getStartedAt().format(FORMATTER)
                                : db.getCreatedAt().format(FORMATTER))
                        .build())
                .collect(Collectors.toList());
        
        return AnalyticsResponse.builder()
                .metrics(metrics)
                .databasesByType(databasesByType)
                .databasesByStatus(databasesByStatus)
                .recentActivity(recentActivity)
                .build();
    }
}
