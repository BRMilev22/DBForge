package com.dbforge.dbforge.service;

import com.dbforge.dbforge.model.ApiToken;
import com.dbforge.dbforge.repository.ApiTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ApiTokenService {
    
    private static final String TOKEN_PREFIX = "dfg_live_";
    private static final int TOKEN_LENGTH = 32; // 32 random bytes
    
    private final ApiTokenRepository apiTokenRepository;
    private final PasswordEncoder passwordEncoder;
    
    /**
     * Generate a new API token for a user
     * 
     * @param userId User ID
     * @param tokenName Human-readable name for the token
     * @param scopes Comma-separated scopes (optional)
     * @param expirationDays Days until expiration (optional, null means no expiration)
     * @return Raw token string (should be returned to user immediately and never stored)
     */
    @Transactional
    public TokenGenerationResult createApiToken(
            Long userId,
            String tokenName,
            String scopes,
            Integer expirationDays) {
        
        // Generate random token
        String rawToken = generateToken();
        String tokenHash = hashToken(rawToken);
        
        // Calculate expiration
        LocalDateTime expiresAt = null;
        if (expirationDays != null && expirationDays > 0) {
            expiresAt = LocalDateTime.now().plusDays(expirationDays);
        }
        
        // Create and save entity
        ApiToken apiToken = ApiToken.builder()
                .userId(userId)
                .tokenName(tokenName)
                .tokenHash(tokenHash)
                .scopes(scopes)
                .expiresAt(expiresAt)
                .isActive(true)
                .build();
        
        apiToken = apiTokenRepository.save(apiToken);
        
        log.info("API token created for user {} with name: {}", userId, tokenName);
        
        return TokenGenerationResult.builder()
                .tokenId(apiToken.getId())
                .rawToken(rawToken)
                .apiToken(apiToken)
                .build();
    }

    /**
     * Create an API token where the total token length (including prefix) is approximately totalLength characters.
     * Uses an alphanumeric random generator for the suffix to control final length.
     */
    @Transactional
    public TokenGenerationResult createApiTokenWithLength(
            Long userId,
            String tokenName,
            String scopes,
            Integer expirationDays,
            int totalLength) {

        if (totalLength <= TOKEN_PREFIX.length() + 8) {
            throw new IllegalArgumentException("totalLength too small");
        }

        // random part length excluding prefix
        int randomPartLength = Math.max(8, totalLength - TOKEN_PREFIX.length());

        String rawToken;
        do {
            rawToken = TOKEN_PREFIX + generateAlphanumericToken(randomPartLength);
        } while (rawToken.contains("."));

        String tokenHash = hashToken(rawToken);

        LocalDateTime expiresAt = null;
        if (expirationDays != null && expirationDays > 0) {
            expiresAt = LocalDateTime.now().plusDays(expirationDays);
        }

        ApiToken apiToken = ApiToken.builder()
                .userId(userId)
                .tokenName(tokenName)
                .tokenHash(tokenHash)
                .scopes(scopes)
                .expiresAt(expiresAt)
                .isActive(true)
                .build();

        apiToken = apiTokenRepository.save(apiToken);

        return TokenGenerationResult.builder()
                .tokenId(apiToken.getId())
                .rawToken(rawToken)
                .apiToken(apiToken)
                .build();
    }
    
    /**
     * Validate an API token and return user ID if valid
     * Updates last_used_at on successful validation
     * 
     * @param rawToken The raw token string from Authorization header
     * @return Optional containing the user ID if token is valid
     */
    @Transactional
    public Optional<Long> validateToken(String rawToken) {
        if (rawToken == null || rawToken.isEmpty()) {
            return Optional.empty();
        }

        // Check if token has correct prefix
        if (!rawToken.startsWith(TOKEN_PREFIX)) {
            return Optional.empty();
        }

        // Fetch all active tokens and check matches using password encoder
        List<ApiToken> activeTokens = apiTokenRepository.findByIsActiveTrue();

        for (ApiToken token : activeTokens) {
            if (token.isValid()) {
                try {
                    if (passwordEncoder.matches(rawToken, token.getTokenHash())) {
                        token.setLastUsedAt(LocalDateTime.now());
                        apiTokenRepository.save(token);
                        log.debug("API token validated for user: {}", token.getUserId());
                        return Optional.of(token.getUserId());
                    }
                } catch (Exception e) {
                    // ignore and continue
                }
            }
        }

        return Optional.empty();
    }
    
    /**
     * Get all tokens for a user
     */
    public List<ApiToken> getUserTokens(Long userId) {
        return apiTokenRepository.findByUserId(userId);
    }
    
    /**
     * Get active tokens for a user
     */
    public List<ApiToken> getActiveUserTokens(Long userId) {
        return apiTokenRepository.findByUserIdAndIsActiveTrue(userId);
    }
    
    /**
     * Deactivate/revoke a token
     */
    @Transactional
    public void revokeToken(Long tokenId) {
        apiTokenRepository.findById(tokenId).ifPresent(token -> {
            token.setIsActive(false);
            apiTokenRepository.save(token);
            log.info("Token revoked: {} for user: {}", token.getTokenName(), token.getUserId());
        });
    }
    
    /**
     * Delete a token
     */
    @Transactional
    public void deleteToken(Long tokenId) {
        apiTokenRepository.deleteById(tokenId);
        log.info("Token deleted: {}", tokenId);
    }
    
    /**
     * Clean up expired tokens (can be called periodically)
     */
    @Transactional
    public int cleanupExpiredTokens() {
        List<ApiToken> expiredTokens = apiTokenRepository.findByExpiresAtBeforeAndIsActiveTrue(LocalDateTime.now());
        
        for (ApiToken token : expiredTokens) {
            token.setIsActive(false);
            apiTokenRepository.save(token);
        }
        
        log.info("Cleaned up {} expired tokens", expiredTokens.size());
        return expiredTokens.size();
    }
    
    /**
     * Generate a cryptographically secure random token
     */
    private String generateToken() {
        String token;
        do {
            byte[] randomBytes = new byte[TOKEN_LENGTH];
            new SecureRandom().nextBytes(randomBytes);
            String encodedToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
            token = TOKEN_PREFIX + encodedToken;
        } while (token.contains("."));
        return token;
    }

    private String generateAlphanumericToken(int length) {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
    
    /**
     * Hash a token using the password encoder
     * This is one-way, so we can safely store it
     */
    private String hashToken(String rawToken) {
        return passwordEncoder.encode(rawToken);
    }
    
    /**
     * Result object for token generation
     */
    @lombok.Builder
    @lombok.Data
    public static class TokenGenerationResult {
        private Long tokenId;
        private String rawToken;
        private ApiToken apiToken;
    }
}
