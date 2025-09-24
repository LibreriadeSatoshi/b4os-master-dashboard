#!/bin/bash
set -e

# Security validation script for B4OS monorepo - Frontend & Backend
echo "Running security validation checks for monorepo..."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
print_fail() { echo -e "${RED}[FAIL]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }

VIOLATIONS=0

echo "========================================"
echo "B4OS Security Validation"
echo "Frontend: NextJS/TypeScript"
echo "Backend: Python"
echo "========================================"

# 1. SECRET SCANNING - Critical patterns for both frontend and backend
echo "Checking for exposed secrets..."
SECRET_PATTERNS=(
    "GITHUB_SECRET=\w+"
    "NEXTAUTH_SECRET=\w+"
    "SUPABASE_SERVICE_ROLE_KEY=\w+"
    "GITHUB_TOKEN=\w+"
    "-----BEGIN.*PRIVATE KEY-----"
    "sk_live_\w+"
    "pk_live_\w+"
    "access_token.*=.*['\"][^'\"]{20,}['\"]"
    "api_key.*=.*['\"][^'\"]{20,}['\"]"
    "secret.*=.*['\"][^'\"]{20,}['\"]"
)

for pattern in "${SECRET_PATTERNS[@]}"; do
    if git diff --cached | grep -E "$pattern" >/dev/null 2>&1; then
        print_fail "Potential secret detected: $pattern"
        ((VIOLATIONS++))
    fi
done

# 2. FRONTEND VALIDATION
echo "Validating Frontend (NextJS/TypeScript)..."
if [ -d "b4os-frontend" ]; then
    cd b4os-frontend

    # Check for hardcoded API keys in frontend files
    if find src/ -name "*.ts" -o -name "*.tsx" | xargs grep -E "(api_key|secret_key|private_key).*=.*['\"][^'\"]{10,}['\"]" 2>/dev/null; then
        print_fail "Hardcoded API keys found in frontend code"
        ((VIOLATIONS++))
    fi

    # Check for console.log statements with sensitive data
    if find src/ -name "*.ts" -o -name "*.tsx" | xargs grep -E "console\.(log|warn|error).*\b(password|secret|token|key)\b" 2>/dev/null | head -3; then
        print_warn "Console statements may expose sensitive data"
    fi

    # Check for direct database queries (should use Supabase client)
    if find src/ -name "*.ts" -o -name "*.tsx" | xargs grep -E "(SELECT|INSERT|UPDATE|DELETE).*\\\$\{" 2>/dev/null; then
        print_fail "Potential SQL injection in frontend - use Supabase client methods"
        ((VIOLATIONS++))
    fi

    # Authorization bypass checks
    auth_files=$(find src/ -name "*.ts" -o -name "*.tsx" | xargs grep -l "isAuthorized\|checkUser\|session\." 2>/dev/null || true)

    for file in $auth_files; do
        # Check for hardcoded admin assignments
        if grep -n "role.*=.*['\"]admin['\"]" "$file" 2>/dev/null | grep -v "authResult\|authorized\|role === 'admin'\|=== 'admin'\|== 'admin'"; then
            print_fail "Hardcoded admin role assignment found in $file"
            ((VIOLATIONS++))
        fi
    done

    cd ..
else
    print_warn "Frontend directory not found, skipping frontend validation"
fi

# 3. BACKEND VALIDATION
echo "Validating Backend (Python)..."
if [ -d "b4os-backend" ]; then
    cd b4os-backend

    # Check for hardcoded secrets in Python files
    if find . -name "*.py" | xargs grep -E "(api_key|secret_key|password).*=.*['\"][^'\"]{10,}['\"]" 2>/dev/null; then
        print_fail "Hardcoded secrets found in Python code"
        ((VIOLATIONS++))
    fi

    # Check for SQL injection vulnerabilities
    if find . -name "*.py" | xargs grep -E "(SELECT|INSERT|UPDATE|DELETE).*\%.*s" 2>/dev/null; then
        print_fail "Potential SQL injection in Python code - use parameterized queries"
        ((VIOLATIONS++))
    fi

    # Check for unsafe eval/exec usage
    if find . -name "*.py" | xargs grep -E "\b(eval|exec)\(" 2>/dev/null; then
        print_fail "Unsafe eval/exec usage found in Python code"
        ((VIOLATIONS++))
    fi

    # Check for print statements that might expose sensitive data
    if find . -name "*.py" | xargs grep -E "print.*\b(password|secret|token|key)\b" 2>/dev/null | head -3; then
        print_warn "Print statements may expose sensitive data"
    fi

    # Check for missing environment variable validation
    env_files=$(find . -name "*.py" | xargs grep -l "os\.environ\|getenv" 2>/dev/null || true)
    for file in $env_files; do
        if ! grep -q "raise.*not.*found\|exit\|sys\.exit" "$file" 2>/dev/null; then
            print_warn "Environment variables in $file may need validation"
        fi
    done

    cd ..
else
    print_warn "Backend directory not found, skipping backend validation"
fi

# 4. ENVIRONMENT VARIABLE VALIDATION
echo "Checking environment variable security..."

# Check root level env files
for env_file in .env.local .env; do
    if [ -f "$env_file" ]; then
        if git diff --cached --name-only | grep -q "$env_file"; then
            print_fail "$env_file is staged for commit - this exposes secrets"
            ((VIOLATIONS++))
        fi

        # Check for weak secrets
        if [ -f "$env_file" ]; then
            NEXTAUTH_SECRET_FROM_FILE=$(grep "^NEXTAUTH_SECRET=" "$env_file" 2>/dev/null | cut -d'=' -f2 | tr -d '"' || echo "")
            if [ -n "$NEXTAUTH_SECRET_FROM_FILE" ] && [ ${#NEXTAUTH_SECRET_FROM_FILE} -lt 32 ]; then
                print_warn "NEXTAUTH_SECRET should be at least 32 characters (current: ${#NEXTAUTH_SECRET_FROM_FILE})"
            fi
        fi
    fi
done

# Check frontend env files
if [ -f "b4os-frontend/.env.local" ]; then
    if git diff --cached --name-only | grep -q "b4os-frontend/\.env\.local"; then
        print_fail "b4os-frontend/.env.local is staged for commit - this exposes secrets"
        ((VIOLATIONS++))
    fi
fi

# Check backend env files
if [ -f "b4os-backend/.env.local" ]; then
    if git diff --cached --name-only | grep -q "b4os-backend/\.env\.local"; then
        print_fail "b4os-backend/.env.local is staged for commit - this exposes secrets"
        ((VIOLATIONS++))
    fi
fi

# 5. DEPENDENCY VULNERABILITIES
echo "Checking dependencies for vulnerabilities..."

# Check frontend dependencies
if [ -f "b4os-frontend/package.json" ]; then
    cd b4os-frontend
    if command -v npm >/dev/null; then
        if npm audit --audit-level high 2>&1 | grep -q "found.*vulnerabilities"; then
            print_fail "High/critical vulnerabilities found in frontend dependencies"
            ((VIOLATIONS++))
        fi
    fi
    cd ..
fi

# Check backend dependencies
if [ -f "b4os-backend/requirements.txt" ]; then
    cd b4os-backend
    if command -v pip >/dev/null; then
        # Check if safety is available for Python security scanning
        if command -v safety >/dev/null; then
            if safety check 2>&1 | grep -q "vulnerability"; then
                print_fail "Vulnerabilities found in Python dependencies"
                ((VIOLATIONS++))
            fi
        else
            print_info "Install 'safety' package for Python security scanning: pip install safety"
        fi
    fi
    cd ..
fi

# 6. GIT SECURITY CHECKS
echo "Checking Git security..."

# Check for large files that shouldn't be committed
large_files=$(git diff --cached --name-only | xargs ls -la 2>/dev/null | awk '$5 > 1048576 {print $9}' || true)
if [ -n "$large_files" ]; then
    print_warn "Large files detected (>1MB): $large_files"
    echo "Consider using Git LFS for large files"
fi

# Check for binary files that might contain secrets
binary_files=$(git diff --cached --name-only | xargs file 2>/dev/null | grep -v "text" | grep -v "directory" || true)
if [ -n "$binary_files" ]; then
    print_info "Binary files detected:"
    echo "$binary_files"
fi

# Results
echo "========================================"
if [ $VIOLATIONS -eq 0 ]; then
    print_pass "Security validation passed - no critical issues found"
    exit 0
else
    print_fail "Security validation failed - $VIOLATIONS critical issues found"
    echo "Fix security issues before committing"
    exit 1
fi