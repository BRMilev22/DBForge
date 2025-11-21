package com.dbforge.dbforge.dto;

import lombok.Data;

import java.util.List;

@Data
public class ExportRequest {
    private List<String> tables;
    private String format; // csv, json, sql
    private Boolean includeSchema;
    private Boolean includeHeaders;
    private Integer limit;
}
