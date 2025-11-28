package com.dbforge.dbforge.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;

@Data
public class QueryRequest {
    private String query;
    private Integer limit; // Optional result limit
    private Integer timeout; // Optional timeout in seconds
    private Boolean explain; // Optional explain/plan request
    
    public static QueryRequest fromJson(String json) {
        ObjectMapper mapper = new ObjectMapper();
        try {
            return mapper.readValue(json, QueryRequest.class);
        } catch (Exception e) {
            throw new RuntimeException("Invalid decrypted query JSON", e);
        }
    }
}