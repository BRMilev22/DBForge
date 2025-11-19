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
public class SchemaInfo {
    private String databaseName;
    private List<TableInfo> tables;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TableInfo {
        private String name;
        private String type; // TABLE, VIEW
        private Long rowCount;
        private List<ColumnInfo> columns;
        private List<IndexInfo> indexes;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ColumnInfo {
        private String name;
        private String dataType;
        private Boolean nullable;
        private String defaultValue;
        private Boolean primaryKey;
        private Boolean autoIncrement;
        private Integer maxLength;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IndexInfo {
        private String name;
        private String type; // PRIMARY, UNIQUE, INDEX
        private List<String> columns;
    }
}
