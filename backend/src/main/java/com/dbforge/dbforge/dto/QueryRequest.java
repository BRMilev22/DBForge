package com.dbforge.dbforge.dto;

import lombok.Data;

@Data
public class QueryRequest {
    private String query;
    private Integer limit; // Optional result limit
    private Integer timeout; // Optional timeout in seconds
    private Boolean explain; // Optional explain/plan request
}
