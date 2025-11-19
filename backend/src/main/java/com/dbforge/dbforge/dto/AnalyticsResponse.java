package com.dbforge.dbforge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsResponse {
    private MetricsData metrics;
    private ChartData databasesByType;
    private ChartData databasesByStatus;
    private List<ActivityEvent> recentActivity;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MetricsData {
        private int totalDatabases;
        private int runningDatabases;
        private int stoppedDatabases;
        private long totalStorage; // in MB
        private double uptime; // percentage
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChartData {
        private List<String> labels;
        private List<Integer> values;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActivityEvent {
        private Long id;
        private String databaseName;
        private String databaseType;
        private String action;
        private String status;
        private String timestamp;
    }
}
