package com.dbforge.dbforge.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateDatabaseRequest {
    private String databaseType;
    private String instanceName;
    private String dbUsername;
    private String dbPassword;
}
