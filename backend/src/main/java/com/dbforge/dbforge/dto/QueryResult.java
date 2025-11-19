package com.dbforge.dbforge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QueryResult {
    private List<String> columns;
    private List<Map<String, Object>> rows;
    private Integer rowCount;
    private Long executionTimeMs;
    private String queryType; // SELECT, INSERT, UPDATE, DELETE
    private Integer affectedRows;
    private String message;
    private Boolean success;
    private String error;
}
