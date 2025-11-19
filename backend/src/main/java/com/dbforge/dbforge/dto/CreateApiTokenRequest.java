package com.dbforge.dbforge.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateApiTokenRequest {
    
    private Long userId;
    
    private String tokenName;
    
    private String scopes; // comma-separated scopes (optional)
    
    private Integer expirationDays; // optional, null means no expiration
}
