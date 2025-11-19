# API Key System Documentation

## Overview

This is a production-ready API key authentication system for Spring Boot with PostgreSQL. It provides secure token generation, validation, and management with support for token expiration and scopes.

## Features

- **Secure Token Generation**: Cryptographically secure random tokens with `dfg_live_` prefix
- **One-Way Hashing**: Tokens are hashed using BCrypt before storage (only raw token returned once)
- **Token Expiration**: Optional token expiration with automatic validation
- **Scopes**: Support for comma-separated permission scopes
- **Last Used Tracking**: Automatic tracking of when tokens are last used
- **Bearer Token Authentication**: Standard HTTP Bearer token support
- **Filter-Based Validation**: Integrated with Spring Security via `OncePerRequestFilter`
- **Comprehensive Management**: Create, list, revoke, and delete tokens via REST API

## Architecture

### Components

#### 1. ApiToken Entity (`model/ApiToken.java`)
JPA entity representing an API token with fields:
- `id`: Primary key
- `userId`: Reference to user
- `tokenName`: Human-readable token name
- `tokenHash`: BCrypt hashed token (one-way)
- `scopes`: Comma-separated permission scopes
- `lastUsedAt`: Timestamp of last validation
- `expiresAt`: Optional expiration timestamp
- `isActive`: Token activation status
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

#### 2. ApiTokenRepository (`repository/ApiTokenRepository.java`)
Spring Data JPA repository with query methods:
- `findByTokenHashAndIsActiveTrue()`: Find active token by hash
- `findByUserIdAndIsActiveTrue()`: Get user's active tokens
- `findByUserId()`: Get all user tokens
- `findByExpiresAtBeforeAndIsActiveTrue()`: Find expired tokens for cleanup

#### 3. ApiTokenService (`service/ApiTokenService.java`)
Core service handling:
- **Token Generation**: `createApiToken()` - generates secure tokens with optional expiration
- **Token Validation**: `validateToken()` - verifies tokens and updates last_used_at
- **Token Management**: List, revoke, delete operations
- **Cleanup**: `cleanupExpiredTokens()` - can be scheduled periodically

Key methods:
```java
// Generate new token
TokenGenerationResult createApiToken(Long userId, String tokenName, String scopes, Integer expirationDays)

// Validate token and get user ID
Optional<Long> validateToken(String rawToken)

// Revoke token
void revokeToken(Long tokenId)

// Delete token
void deleteToken(Long tokenId)

// Clean up expired tokens
int cleanupExpiredTokens()
```

#### 4. ApiKeyFilter (`config/ApiKeyFilter.java`)
Custom `OncePerRequestFilter` that:
- Extracts Bearer token from Authorization header
- Validates token via `ApiTokenService.validateToken()`
- Sets authenticated user in Spring Security context
- Returns 401 JSON response for invalid tokens

#### 5. SecurityConfig (`config/SecurityConfig.java`)
Updated to register `ApiKeyFilter` before `UsernamePasswordAuthenticationFilter`:
```java
.addFilterBefore(apiKeyFilter, UsernamePasswordAuthenticationFilter.class)
.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
```

#### 6. ApiTokenController (`controller/ApiTokenController.java`)
REST API endpoints:
- `POST /api/tokens/create` - Create new token
- `GET /api/tokens` - List user's tokens
- `POST /api/tokens/{tokenId}/revoke` - Revoke token
- `DELETE /api/tokens/{tokenId}` - Delete token

#### 7. DTOs
- `CreateApiTokenRequest`: Request to create token
- `CreateApiTokenResponse`: Response with raw token (only returned once)
- `ApiTokenInfo`: Token information (without hash)

## Database Schema

PostgreSQL migration creates `api_tokens` table:

```sql
CREATE TABLE api_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_name VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    scopes TEXT,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_is_active (is_active),
    INDEX idx_expires_at (expires_at)
);
```

## Usage Examples

### 1. Create API Token

**Request:**
```bash
curl -X POST http://localhost:8080/api/tokens/create \
  -H "Authorization: Bearer <user-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "tokenName": "Production API Key",
    "scopes": "read,write",
    "expirationDays": 90
  }'
```

**Response:**
```json
{
  "tokenId": 123,
  "token": "dfg_live_abcd1234efgh5678ijkl9012mnop3456",
  "tokenName": "Production API Key",
  "scopes": "read,write",
  "expiresAt": "2026-02-17T10:30:00",
  "createdAt": "2025-11-19T10:30:00"
}
```

⚠️ **Important**: Save the raw token immediately. It's only returned once and cannot be recovered.

### 2. Use API Token

**Request with API token:**
```bash
curl -H "Authorization: Bearer dfg_live_abcd1234efgh5678ijkl9012mnop3456" \
  http://localhost:8080/api/protected-endpoint
```

### 3. List User Tokens

**Request:**
```bash
curl -H "Authorization: Bearer <api-token-or-jwt>" \
  http://localhost:8080/api/tokens
```

**Response:**
```json
[
  {
    "id": 123,
    "tokenName": "Production API Key",
    "scopes": "read,write",
    "lastUsedAt": "2025-11-19T15:30:00",
    "expiresAt": "2026-02-17T10:30:00",
    "isActive": true,
    "createdAt": "2025-11-19T10:30:00"
  }
]
```

### 4. Revoke Token

**Request:**
```bash
curl -X POST http://localhost:8080/api/tokens/123/revoke \
  -H "Authorization: Bearer <api-token-or-jwt>"
```

### 5. Delete Token

**Request:**
```bash
curl -X DELETE http://localhost:8080/api/tokens/123 \
  -H "Authorization: Bearer <api-token-or-jwt>"
```

## Security Considerations

### Token Storage
- Only the **hash** is stored in the database
- Raw token is returned **only once** to the user
- Uses BCrypt (same as password encoding) for one-way hashing
- Token hash is unique in the database

### Token Generation
- Uses `SecureRandom` for cryptographically secure randomness
- Generates 32 random bytes (256 bits) per token
- Base64 URL-encoded without padding
- Prefix `dfg_live_` identifies API tokens

### Validation
- Validates token prefix before hashing
- Checks expiration on every use
- Verifies `isActive` flag
- Updates `lastUsedAt` for audit trails

### Best Practices
1. **Never log raw tokens** - Only token IDs and hashes
2. **Rotate tokens regularly** - Implement expiration strategy
3. **Use HTTPS only** - Transmit tokens over encrypted connections
4. **Scope tokens appropriately** - Limit permissions as needed
5. **Audit token usage** - Monitor `lastUsedAt` for suspicious activity
6. **Set reasonable expiration** - Balance security with usability

## Configuration

### Customize Token Prefix
Edit `ApiTokenService.TOKEN_PREFIX`:
```java
private static final String TOKEN_PREFIX = "dfg_live_";
```

### Adjust Token Length
Edit `ApiTokenService.TOKEN_LENGTH`:
```java
private static final int TOKEN_LENGTH = 32; // 32 bytes = 256 bits
```

### Scheduled Cleanup
Add scheduled task to clean up expired tokens:
```java
@Configuration
@EnableScheduling
public class SchedulingConfig {
    
    @Autowired
    private ApiTokenService apiTokenService;
    
    @Scheduled(cron = "0 0 2 * * ?") // Run daily at 2 AM
    public void cleanupExpiredTokens() {
        int cleaned = apiTokenService.cleanupExpiredTokens();
        log.info("Cleaned up {} expired API tokens", cleaned);
    }
}
```

## Error Handling

### Invalid Token
```json
{
  "error": "Invalid or expired API token"
}
```
HTTP Status: **401 Unauthorized**

### Missing Required Fields
```json
{
  "error": "userId is required"
}
```
HTTP Status: **400 Bad Request**

### Unauthorized Action
```json
{
  "error": "Cannot create tokens for other users"
}
```
HTTP Status: **403 Forbidden**

## Testing

### Unit Test Example
```java
@Test
public void testTokenGeneration() {
    // Generate token
    ApiTokenService.TokenGenerationResult result = apiTokenService.createApiToken(
        1L, "Test Token", "read,write", 30
    );
    
    // Validate token
    Optional<Long> userId = apiTokenService.validateToken(result.getRawToken());
    
    assertTrue(userId.isPresent());
    assertEquals(1L, userId.get());
}

@Test
public void testExpiredToken() {
    // Generate token with 0 expiration days (already expired)
    ApiTokenService.TokenGenerationResult result = apiTokenService.createApiToken(
        1L, "Expired Token", null, 0
    );
    
    // Validation should fail
    Optional<Long> userId = apiTokenService.validateToken(result.getRawToken());
    assertFalse(userId.isPresent());
}

@Test
public void testRevokedToken() {
    // Generate token
    ApiTokenService.TokenGenerationResult result = apiTokenService.createApiToken(
        1L, "Test Token", null, 30
    );
    
    // Revoke token
    apiTokenService.revokeToken(result.getTokenId());
    
    // Validation should fail
    Optional<Long> userId = apiTokenService.validateToken(result.getRawToken());
    assertFalse(userId.isPresent());
}
```

### Integration Test Example
```java
@Test
public void testApiTokenEndpoint() {
    CreateApiTokenRequest request = new CreateApiTokenRequest();
    request.setUserId(1L);
    request.setTokenName("Integration Test Token");
    request.setScopes("read");
    request.setExpirationDays(7);
    
    ResponseEntity<?> response = restTemplate.postForEntity(
        "/api/tokens/create",
        request,
        CreateApiTokenResponse.class
    );
    
    assertEquals(HttpStatus.CREATED, response.getStatusCode());
    CreateApiTokenResponse tokenResponse = (CreateApiTokenResponse) response.getBody();
    assertNotNull(tokenResponse.getToken());
    assertTrue(tokenResponse.getToken().startsWith("dfg_live_"));
}
```

## Monitoring & Maintenance

### Key Metrics to Track
- Number of active tokens per user
- Token usage frequency (lastUsedAt)
- Expired token cleanup rate
- Failed validation attempts
- Token creation rate

### Log Statements
- Token creation: INFO level with user ID and token name
- Token validation: DEBUG level for successful validations
- Token revocation: INFO level
- Cleanup operations: INFO level with count of tokens cleaned
- Invalid token attempts: WARN level

## Future Enhancements

1. **IP Whitelisting**: Restrict token usage to specific IPs
2. **Rate Limiting**: Limit API calls per token
3. **Webhook Events**: Notify on token creation/revocation
4. **Token Rotation**: Automatic rotation with grace period
5. **Audit Logging**: Detailed audit trail of all token operations
6. **Custom Scopes Validation**: Validate scopes against allowed set
7. **Token Versioning**: Support for different token formats

---

**Created**: November 19, 2025
**Status**: Production-Ready
**License**: Your Project License
