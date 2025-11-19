package com.dbforge.dbforge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiTokenInfo {
    
    private Long id;
    
    private String tokenName;
    
    private String scopes;
    
    private LocalDateTime lastUsedAt;
    
    private LocalDateTime expiresAt;
    
    private Boolean isActive;
    
    private LocalDateTime createdAt;
}
