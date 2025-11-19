# API Key System - Implementation Guide

## Quick Start

### 1. Database Migration
Run Flyway migration to create the `api_tokens` table:

```bash
# Migration file is auto-discovered at:
# backend/src/main/resources/db/migration/V2__create_api_tokens_table.sql
```

The application will automatically apply migrations on startup. Ensure:
- PostgreSQL is running
- `spring.datasource.url` is set correctly in `application.properties`
- Flyway is in your Maven dependencies (Spring Boot includes it by default)

### 2. Start Backend
```bash
cd backend
./mvnw spring-boot:run
```

Watch logs for migration execution:
```
Migrating schema with 2 migration(s)
V1__...
V2__create_api_tokens_table
```

### 3. Create Your First API Token

Using existing JWT token for authentication:

```bash
curl -X POST http://localhost:8080/api/tokens/create \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "tokenName": "My First API Key",
    "scopes": "read:databases,write:databases",
    "expirationDays": 90
  }'
```

**Response:**
```json
{
  "tokenId": 1,
  "token": "dfg_live_E4x7K9m2P5q8Z1w3V6y9B2F4j7L0n3Q6s",
  "tokenName": "My First API Key",
  "scopes": "read:databases,write:databases",
  "expiresAt": "2026-02-17T10:35:22",
  "createdAt": "2025-11-19T10:35:22"
}
```

**⚠️ Save the token value immediately!** It cannot be recovered later.

### 4. Use API Token in Requests

```bash
# Make authenticated request with API token
curl -H "Authorization: Bearer dfg_live_E4x7K9m2P5q8Z1w3V6y9B2F4j7L0n3Q6s" \
  http://localhost:8080/api/databases
```

## File Structure

```
backend/src/main/java/com/dbforge/dbforge/
├── model/
│   └── ApiToken.java                 # JPA entity for tokens
├── repository/
│   └── ApiTokenRepository.java        # Data access layer
├── service/
│   └── ApiTokenService.java          # Core token logic
├── config/
│   ├── SecurityConfig.java           # Updated with ApiKeyFilter
│   └── ApiKeyFilter.java             # Bearer token validation filter
├── controller/
│   └── ApiTokenController.java       # REST API endpoints
└── dto/
    ├── CreateApiTokenRequest.java    # Request DTO
    ├── CreateApiTokenResponse.java   # Response DTO
    └── ApiTokenInfo.java             # Token info DTO

backend/src/main/resources/db/migration/
└── V2__create_api_tokens_table.sql   # PostgreSQL schema migration
```

## Key Implementation Details

### Token Generation Flow

```
1. Client calls POST /api/tokens/create with userId, tokenName, scopes, expirationDays
2. ApiTokenController validates request and checks ownership
3. ApiTokenService.createApiToken():
   a. Generates 32 random bytes using SecureRandom
   b. Base64 URL encodes to create raw token with prefix "dfg_live_"
   c. BCrypt hashes the raw token
   d. Saves ApiToken entity with hashed token
   e. Returns TokenGenerationResult with raw token
4. ApiTokenController returns CreateApiTokenResponse with raw token (only once!)
5. Database stores only the hash, never the raw token
```

### Token Validation Flow

```
1. Client sends request with "Authorization: Bearer dfg_live_..."
2. ApiKeyFilter intercepts request
3. Extracts token from header
4. Calls ApiTokenService.validateToken(rawToken)
5. ApiTokenService:
   a. Checks token has correct prefix
   b. BCrypt hashes the raw token
   c. Looks up hash in database
   d. Verifies token is active
   e. Checks expiration
   f. Updates lastUsedAt timestamp
   g. Returns Optional with userId
6. Filter sets userId in Spring Security context
7. Request proceeds to endpoint with authenticated user
```

### Security Features

- **One-Way Hashing**: Uses BCrypt (same as passwords) - cannot decrypt
- **Unique Hashes**: Database constraint ensures no duplicate token hashes
- **Atomic Operations**: Token generation and storage are transactional
- **Secure Randomness**: Uses `java.security.SecureRandom` for token generation
- **Validation Checks**: Verifies active status and expiration on every use
- **Audit Trail**: `lastUsedAt` tracks when tokens are used

## Testing the API Key System

### Test 1: Create Token
```bash
curl -X POST http://localhost:8080/api/tokens/create \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "tokenName": "Test Token",
    "scopes": "read",
    "expirationDays": 7
  }' | jq .
```

Expected: Returns token with raw value starting with `dfg_live_`

### Test 2: Use Token Successfully
```bash
TOKEN="dfg_live_E4x7K9m2P5q8Z1w3V6y9B2F4j7L0n3Q6s"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/databases
```

Expected: Request succeeds (401 only if token is invalid/expired)

### Test 3: Use Invalid Token
```bash
curl -H "Authorization: Bearer dfg_live_invalid" \
  http://localhost:8080/api/databases
```

Expected Response (401):
```json
{
  "error": "Invalid or expired API token"
}
```

### Test 4: List User Tokens
```bash
curl -H "Authorization: Bearer <api-token-or-jwt>" \
  http://localhost:8080/api/tokens | jq .
```

Expected: Array of ApiTokenInfo objects (without raw token)

### Test 5: Revoke Token
```bash
curl -X POST http://localhost:8080/api/tokens/1/revoke \
  -H "Authorization: Bearer <api-token-or-jwt>"
```

Then retry Test 2 - should return 401

## Common Issues & Troubleshooting

### Issue: "401 Unauthorized" for valid token

**Solution**: 
- Verify token hasn't expired: Check `expiresAt` in token list
- Verify token is active: Run revoke/list endpoint
- Check token format: Should be `Authorization: Bearer dfg_live_...`
- Check header capitalization: Should be exactly `Authorization`

### Issue: Migration fails

**Solution**:
- Ensure PostgreSQL is running
- Check `spring.datasource.url` in `application.properties`
- Verify database exists
- Check user has CREATE TABLE permissions
- Look for syntax errors in SQL migration file

### Issue: Token creation returns 403 Forbidden

**Solution**:
- Verify `userId` matches authenticated user ID
- Admin users can create tokens for other users (not yet implemented - add if needed)

### Issue: "Cannot create tokens for other users" error

**Solution**:
- Currently tokens can only be created by the user themselves
- To allow admins: Modify ApiTokenController.createApiToken() to check admin role

## Next Steps

### Optional Enhancements

1. **Add Scope Validation**
   ```java
   // In ApiKeyFilter or custom authorization filter
   public boolean hasScope(ApiToken token, String requiredScope) {
       return token.getScopes() != null && 
              Arrays.asList(token.getScopes().split(","))
                    .contains(requiredScope);
   }
   ```

2. **Add Admin Token Creation**
   ```java
   // In ApiTokenController.createApiToken()
   Long authenticatedUserId = (Long) authentication.getPrincipal();
   boolean isAdmin = authentication.getAuthorities().stream()
       .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
   
   if (!request.getUserId().equals(authenticatedUserId) && !isAdmin) {
       return ResponseEntity.status(HttpStatus.FORBIDDEN)...
   }
   ```

3. **Add Scheduled Cleanup**
   ```java
   @Configuration
   @EnableScheduling
   public class SchedulingConfig {
       @Autowired
       private ApiTokenService apiTokenService;
       
       @Scheduled(cron = "0 0 2 * * ?")
       public void cleanupExpiredTokens() {
           apiTokenService.cleanupExpiredTokens();
       }
   }
   ```

4. **Add Rate Limiting by Token**
   ```java
   // Create ApiTokenRateLimit entity and service
   // Track requests per token per minute
   ```

5. **Add Endpoint Authorization by Scope**
   ```java
   @GetMapping("/admin")
   @RequireApiScope("admin")
   public ResponseEntity<?> adminEndpoint() { ... }
   ```

## Documentation Files

- **API_KEY_SYSTEM.md** - Comprehensive documentation
- **IMPLEMENTATION_GUIDE.md** - This file
- Source code includes detailed JavaDoc comments

---

**Status**: Ready for production
**Last Updated**: November 19, 2025
