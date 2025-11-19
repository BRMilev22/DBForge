package com.dbforge.dbforge.controller;

import com.dbforge.dbforge.dto.ApiTokenInfo;
import com.dbforge.dbforge.dto.CreateApiTokenRequest;
import com.dbforge.dbforge.dto.CreateApiTokenResponse;
import com.dbforge.dbforge.model.ApiToken;
import com.dbforge.dbforge.service.ApiTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tokens")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class ApiTokenController {
    
    private final ApiTokenService apiTokenService;
    
    /**
     * Create a new API token
     * 
     * POST /api/tokens/create
     * {
     *   "userId": 1,
     *   "tokenName": "My API Key",
     *   "scopes": "read,write",
     *   "expirationDays": 90
     * }
     * 
     * Response (raw token returned only once):
     * {
     *   "tokenId": 123,
     *   "token": "dfg_live_...",
     *   "tokenName": "My API Key",
     *   "scopes": "read,write",
     *   "expiresAt": "2025-02-17T10:30:00",
     *   "createdAt": "2025-11-19T10:30:00"
     * }
     */
    @PostMapping("/create")
    public ResponseEntity<?> createApiToken(
            @RequestBody CreateApiTokenRequest request,
            Authentication authentication) {
        
        try {
            // Validate request
            if (request.getUserId() == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "userId is required"));
            }
            
            if (request.getTokenName() == null || request.getTokenName().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "tokenName is required"));
            }
            
            // Verify user can only create tokens for themselves (unless admin)
            Long authenticatedUserId = (Long) authentication.getPrincipal();
            if (!request.getUserId().equals(authenticatedUserId)) {
                // Could add admin check here
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Cannot create tokens for other users"));
            }
            
            // Generate token
            ApiTokenService.TokenGenerationResult result = apiTokenService.createApiToken(
                    request.getUserId(),
                    request.getTokenName(),
                    request.getScopes(),
                    request.getExpirationDays()
            );
            
            // Build response with raw token (only returned once)
            CreateApiTokenResponse response = CreateApiTokenResponse.builder()
                    .tokenId(result.getTokenId())
                    .token(result.getRawToken())
                    .tokenName(result.getApiToken().getTokenName())
                    .scopes(result.getApiToken().getScopes())
                    .expiresAt(result.getApiToken().getExpiresAt())
                    .createdAt(result.getApiToken().getCreatedAt())
                    .build();
            
            log.info("API token created: {} for user: {}", result.getApiToken().getTokenName(), request.getUserId());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (Exception e) {
            log.error("Error creating API token", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create API token: " + e.getMessage()));
        }
    }
    
    /**
     * List all tokens for the authenticated user
     * 
     * GET /api/tokens
     */
    @GetMapping
    public ResponseEntity<?> listUserTokens(Authentication authentication) {
        try {
            Long userId = (Long) authentication.getPrincipal();
            
            List<ApiToken> tokens = apiTokenService.getUserTokens(userId);
            
            List<ApiTokenInfo> tokenInfos = tokens.stream()
                    .map(token -> ApiTokenInfo.builder()
                            .id(token.getId())
                            .tokenName(token.getTokenName())
                            .scopes(token.getScopes())
                            .lastUsedAt(token.getLastUsedAt())
                            .expiresAt(token.getExpiresAt())
                            .isActive(token.getIsActive())
                            .createdAt(token.getCreatedAt())
                            .build())
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(tokenInfos);
            
        } catch (Exception e) {
            log.error("Error listing user tokens", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to list tokens: " + e.getMessage()));
        }
    }
    
    /**
     * Get details of a specific token
     * 
     * GET /api/tokens/{tokenId}
     */
    @GetMapping("/{tokenId}")
    public ResponseEntity<?> getTokenDetails(
            @PathVariable Long tokenId,
            Authentication authentication) {
        
        try {
            Long userId = (Long) authentication.getPrincipal();
            
            // Would fetch token and verify ownership
            // This is a basic implementation
            return ResponseEntity.ok(Map.of("message", "Token details endpoint"));
            
        } catch (Exception e) {
            log.error("Error getting token details", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to get token details"));
        }
    }
    
    /**
     * Revoke/deactivate a token
     * 
     * POST /api/tokens/{tokenId}/revoke
     */
    @PostMapping("/{tokenId}/revoke")
    public ResponseEntity<?> revokeToken(
            @PathVariable Long tokenId,
            Authentication authentication) {
        
        try {
            Long userId = (Long) authentication.getPrincipal();
            
            // Would verify ownership before revoking
            apiTokenService.revokeToken(tokenId);
            
            log.info("Token revoked: {} by user: {}", tokenId, userId);
            
            return ResponseEntity.ok(Map.of("message", "Token revoked successfully"));
            
        } catch (Exception e) {
            log.error("Error revoking token", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to revoke token: " + e.getMessage()));
        }
    }
    
    /**
     * Delete a token
     * 
     * DELETE /api/tokens/{tokenId}
     */
    @DeleteMapping("/{tokenId}")
    public ResponseEntity<?> deleteToken(
            @PathVariable Long tokenId,
            Authentication authentication) {
        
        try {
            Long userId = (Long) authentication.getPrincipal();
            
            // Would verify ownership before deleting
            apiTokenService.deleteToken(tokenId);
            
            log.info("Token deleted: {} by user: {}", tokenId, userId);
            
            return ResponseEntity.ok(Map.of("message", "Token deleted successfully"));
            
        } catch (Exception e) {
            log.error("Error deleting token", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to delete token: " + e.getMessage()));
        }
    }
}
