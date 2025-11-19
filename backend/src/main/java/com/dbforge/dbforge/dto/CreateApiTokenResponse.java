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
public class CreateApiTokenResponse {
    
    private Long tokenId;
    
    private String token; // raw token (only returned once)
    
    private String tokenName;
    
    private String scopes;
    
    private LocalDateTime expiresAt;
    
    private LocalDateTime createdAt;
}
