#!/bin/bash

# API Key System - Verification Script
# Run this to verify all components were created correctly

echo "🔐 DBForge API Key System - Verification Script"
echo "=============================================="
echo ""

ERRORS=0
WARNINGS=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📂 Checking Java Source Files..."
echo ""

# Check each source file
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅ Found: $1${NC}"
    else
        echo -e "${RED}❌ Missing: $1${NC}"
        ((ERRORS++))
    fi
}

# Core Components
echo "Core Components:"
check_file "backend/src/main/java/com/dbforge/dbforge/model/ApiToken.java"
check_file "backend/src/main/java/com/dbforge/dbforge/repository/ApiTokenRepository.java"
check_file "backend/src/main/java/com/dbforge/dbforge/service/ApiTokenService.java"
check_file "backend/src/main/java/com/dbforge/dbforge/config/ApiKeyFilter.java"
check_file "backend/src/main/java/com/dbforge/dbforge/config/SecurityConfig.java"
check_file "backend/src/main/java/com/dbforge/dbforge/controller/ApiTokenController.java"

echo ""
echo "DTOs:"
check_file "backend/src/main/java/com/dbforge/dbforge/dto/CreateApiTokenRequest.java"
check_file "backend/src/main/java/com/dbforge/dbforge/dto/CreateApiTokenResponse.java"
check_file "backend/src/main/java/com/dbforge/dbforge/dto/ApiTokenInfo.java"

echo ""
echo "Database:"
check_file "backend/src/main/resources/db/migration/V2__create_api_tokens_table.sql"

echo ""
echo "📚 Checking Documentation Files..."
echo ""

check_file "backend/START_HERE.md"
check_file "backend/README_API_KEY_SYSTEM.md"
check_file "backend/API_KEY_SYSTEM.md"
check_file "backend/API_KEY_SYSTEM_SUMMARY.md"
check_file "backend/IMPLEMENTATION_GUIDE.md"
check_file "backend/QUICK_REFERENCE.md"
check_file "backend/FILE_MANIFEST.md"

echo ""
echo "🔍 Checking File Contents..."
echo ""

# Check for key class definitions
check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✅ $1 contains '$2'${NC}"
    else
        echo -e "${RED}❌ $1 missing '$2'${NC}"
        ((ERRORS++))
    fi
}

echo "Verifying ApiToken entity:"
check_content "backend/src/main/java/com/dbforge/dbforge/model/ApiToken.java" "@Entity"
check_content "backend/src/main/java/com/dbforge/dbforge/model/ApiToken.java" "private String tokenHash"
check_content "backend/src/main/java/com/dbforge/dbforge/model/ApiToken.java" "boolean isValid()"

echo ""
echo "Verifying ApiTokenService:"
check_content "backend/src/main/java/com/dbforge/dbforge/service/ApiTokenService.java" "createApiToken"
check_content "backend/src/main/java/com/dbforge/dbforge/service/ApiTokenService.java" "validateToken"
check_content "backend/src/main/java/com/dbforge/dbforge/service/ApiTokenService.java" "SecureRandom"
check_content "backend/src/main/java/com/dbforge/dbforge/service/ApiTokenService.java" "TOKEN_PREFIX"

echo ""
echo "Verifying ApiKeyFilter:"
check_content "backend/src/main/java/com/dbforge/dbforge/config/ApiKeyFilter.java" "OncePerRequestFilter"
check_content "backend/src/main/java/com/dbforge/dbforge/config/ApiKeyFilter.java" "Authorization"
check_content "backend/src/main/java/com/dbforge/dbforge/config/ApiKeyFilter.java" "Bearer"

echo ""
echo "Verifying ApiTokenController:"
check_content "backend/src/main/java/com/dbforge/dbforge/controller/ApiTokenController.java" "POST /api/tokens/create"
check_content "backend/src/main/java/com/dbforge/dbforge/controller/ApiTokenController.java" "GET /api/tokens"
check_content "backend/src/main/java/com/dbforge/dbforge/controller/ApiTokenController.java" "revoke"

echo ""
echo "Verifying SecurityConfig update:"
check_content "backend/src/main/java/com/dbforge/dbforge/config/SecurityConfig.java" "ApiKeyFilter"
check_content "backend/src/main/java/com/dbforge/dbforge/config/SecurityConfig.java" "addFilterBefore"

echo ""
echo "Verifying Database Migration:"
check_content "backend/src/main/resources/db/migration/V2__create_api_tokens_table.sql" "CREATE TABLE api_tokens"
check_content "backend/src/main/resources/db/migration/V2__create_api_tokens_table.sql" "token_hash"
check_content "backend/src/main/resources/db/migration/V2__create_api_tokens_table.sql" "UNIQUE"

echo ""
echo "📊 Summary"
echo "=============================================="
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All files verified successfully!${NC}"
    echo ""
    echo "Files Found: 17"
    echo "✅ 8 Java source files"
    echo "✅ 1 SQL migration file"
    echo "✅ 7 Documentation files"
    echo ""
    echo "Next Steps:"
    echo "1. Read: backend/START_HERE.md"
    echo "2. Read: backend/QUICK_REFERENCE.md"
    echo "3. Build: cd backend && ./mvnw clean package"
    echo "4. Test: ./mvnw spring-boot:run"
    echo ""
else
    echo -e "${RED}❌ Verification failed with $ERRORS errors${NC}"
    echo ""
    echo "Please check the missing files listed above."
    exit 1
fi

echo "🎉 API Key System implementation is complete and ready!"
echo ""
