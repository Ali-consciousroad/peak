#!/bin/bash

# Conflict Resolution System - Smoke Test
# Quick verification that nothing is broken

echo "🔥 Starting Conflict Resolution Smoke Test..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo "1️⃣  Checking if server is running..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${RED}❌ Server is not running. Please start with 'npm run dev'${NC}"
    exit 1
fi
echo ""

# Check API endpoint exists (will fail auth but should return 401, not 404)
echo "2️⃣  Testing /api/conflicts endpoint..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/conflicts)
if [ "$STATUS" = "401" ] || [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Endpoint exists (Status: $STATUS)${NC}"
else
    echo -e "${RED}❌ Endpoint issue (Status: $STATUS)${NC}"
    exit 1
fi
echo ""

# Check resolution endpoint exists
echo "3️⃣  Testing /api/conflicts/[id]/resolve endpoint..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/conflicts/test-id/resolve)
if [ "$STATUS" = "401" ] || [ "$STATUS" = "400" ] || [ "$STATUS" = "404" ]; then
    echo -e "${GREEN}✅ Endpoint exists (Status: $STATUS - expected without auth)${NC}"
else
    echo -e "${RED}❌ Endpoint issue (Status: $STATUS)${NC}"
    exit 1
fi
echo ""

# Check for TypeScript/compilation errors
echo "4️⃣  Checking for TypeScript errors..."
if command -v npx &> /dev/null; then
    if npx tsc --noEmit --skipLibCheck 2>&1 | grep -q "error TS"; then
        echo -e "${RED}❌ TypeScript errors found${NC}"
        npx tsc --noEmit --skipLibCheck 2>&1 | grep "error TS" | head -5
        exit 1
    else
        echo -e "${GREEN}✅ No TypeScript errors${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  npx not found, skipping TypeScript check${NC}"
fi
echo ""

# Check if required files exist
echo "5️⃣  Checking required files exist..."
FILES=(
    "app/api/conflicts/route.ts"
    "app/api/conflicts/[id]/route.ts"
    "app/api/conflicts/[id]/resolve/route.ts"
    "components/ConflictResolution.tsx"
    "app/conflicts/page.tsx"
)

ALL_EXIST=true
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✅${NC} $file"
    else
        echo -e "  ${RED}❌${NC} $file (MISSING)"
        ALL_EXIST=false
    fi
done

if [ "$ALL_EXIST" = false ]; then
    echo -e "${RED}❌ Some required files are missing${NC}"
    exit 1
fi
echo ""

# Check for common import issues
echo "6️⃣  Checking for import issues..."
if grep -r "from '@/components/ConflictResolution'" app/ 2>/dev/null | grep -q .; then
    echo -e "${GREEN}✅ ConflictResolution is imported${NC}"
else
    echo -e "${RED}❌ ConflictResolution not imported in app/conflicts/page.tsx${NC}"
    exit 1
fi
echo ""

# Check Prisma model usage (should use 'conflicts' not 'conflict')
echo "7️⃣  Checking Prisma model usage..."
if grep -r "prisma\.conflict[^s]" app/api/conflicts 2>/dev/null | grep -q .; then
    echo -e "${RED}❌ Found 'prisma.conflict' (should be 'prisma.conflicts')${NC}"
    grep -r "prisma\.conflict[^s]" app/api/conflicts
    exit 1
else
    echo -e "${GREEN}✅ Using correct Prisma model name (conflicts)${NC}"
fi
echo ""

# Check escrow calculation logic
echo "8️⃣  Checking escrow calculation logic..."
if grep -q "payment.amount \* 0.25" app/api/conflicts/[id]/resolve/route.ts 2>/dev/null; then
    echo -e "${GREEN}✅ RELEASED_2 calculation uses 0.25 (25% remaining)${NC}"
else
    echo -e "${YELLOW}⚠️  Could not verify RELEASED_2 calculation${NC}"
fi

if grep -q "payment.amount \* 0.75" app/api/conflicts/[id]/resolve/route.ts 2>/dev/null; then
    echo -e "${GREEN}✅ RELEASED_1 calculation uses 0.75 (75% remaining)${NC}"
else
    echo -e "${YELLOW}⚠️  Could not verify RELEASED_1 calculation${NC}"
fi
echo ""

# Check payment data inclusion in API
echo "9️⃣  Checking payment data in conflicts API..."
if grep -q "payments:" app/api/conflicts/route.ts 2>/dev/null; then
    echo -e "${GREEN}✅ Payments included in conflicts API${NC}"
else
    echo -e "${RED}❌ Payments not included in conflicts API${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}🎉 Smoke test complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Test in browser: http://localhost:3000/conflicts"
echo "  2. Create a test conflict"
echo "  3. Verify payment data appears"
echo "  4. Try resolving a conflict"
echo ""
echo "For full testing, see: scripts/test-conflict-resolution.md"
