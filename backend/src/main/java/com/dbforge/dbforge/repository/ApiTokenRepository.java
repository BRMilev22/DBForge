package com.dbforge.dbforge.repository;

import com.dbforge.dbforge.model.ApiToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ApiTokenRepository extends JpaRepository<ApiToken, Long> {
    
    /**
     * Find an active API token by its hash
     */
    Optional<ApiToken> findByTokenHashAndIsActiveTrue(String tokenHash);
    
    /**
     * Find all active tokens for a user
     */
    List<ApiToken> findByUserIdAndIsActiveTrue(Long userId);
    
    /**
     * Find all tokens for a user (active or inactive)
     */
    List<ApiToken> findByUserId(Long userId);
    
    /**
     * Find a specific token by user ID and token name
     */
    Optional<ApiToken> findByUserIdAndTokenName(Long userId, String tokenName);
    
    /**
     * Find all expired tokens (for cleanup operations)
     */
    List<ApiToken> findByExpiresAtBeforeAndIsActiveTrue(LocalDateTime expiresAt);

    /**
     * Find all active tokens across all users
     */
    List<ApiToken> findByIsActiveTrue();

    /**
     * Find all active tokens for a specific database instance
     */
    List<ApiToken> findByDatabaseInstanceIdAndIsActiveTrue(Long databaseInstanceId);

    /**
     * Find all tokens for a specific database instance
     */
    List<ApiToken> findByDatabaseInstanceId(Long databaseInstanceId);

    /**
     * Find a specific token by user ID, token name, and database instance
     */
    Optional<ApiToken> findByUserIdAndTokenNameAndDatabaseInstanceId(Long userId, String tokenName, Long databaseInstanceId);
}
