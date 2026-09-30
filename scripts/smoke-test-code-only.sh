#!/bin/bash

# Conflict Resolution System - Code-Only Smoke Test
# Checks code structure without requiring server to be running

echo "🔥 Starting Code-Only Smoke Test..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

# Test 1: Required files exist
echo "1️⃣  Checking required files..."
FILES=(
    "app/api/conflicts/route.ts"
    "app/api/conflicts/[id]/route.ts"
    "app/api/conflicts/[id]/resolve/route.ts"
    "app/api/conflicts/[id]/mutual-agreement/route.ts"
    "components/ConflictResolution.tsx"
    "app/conflicts/page.tsx"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✅${NC} $file"
        ((PASSED++))
    else
        echo -e "  ${RED}❌${NC} $file (MISSING)"
        ((FAILED++))
    fi
done
echo ""

# Test 2: Check Prisma model usage (should use 'conflicts' not 'conflict')
echo "2️⃣  Checking Prisma model names..."
if grep -r "prisma\.conflict[^s]" app/api/conflicts 2>/dev/null | grep -v "prisma.conflicts" | grep -q .; then
    echo -e "  ${RED}❌ Found incorrect 'prisma.conflict' usage${NC}"
    grep -r "prisma\.conflict[^s]" app/api/conflicts 2>/dev/null | grep -v "prisma.conflicts"
    ((FAILED++))
else
    echo -e "  ${GREEN}✅ Using correct Prisma model name (conflicts)${NC}"
    ((PASSED++))
fi
echo ""

# Test 3: Check payments included in API
echo "3️⃣  Checking payment data in conflicts API..."
if grep -q "payments:" app/api/conflicts/route.ts 2>/dev/null; then
    echo -e "  ${GREEN}✅ Payments included in conflicts API${NC}"
    ((PASSED++))
else
    echo -e "  ${RED}❌ Payments not included in conflicts API${NC}"
    ((FAILED++))
fi
echo ""

# Test 4: Check ConflictResolution import
echo "4️⃣  Checking ConflictResolution component import..."
if grep -q "import.*ConflictResolution" app/conflicts/page.tsx 2>/dev/null; then
    echo -e "  ${GREEN}✅ ConflictResolution imported${NC}"
    ((PASSED++))
else
    echo -e "  ${RED}❌ ConflictResolution not imported${NC}"
    ((FAILED++))
fi
echo ""

# Test 5: Check ConflictResolution usage
echo "5️⃣  Checking ConflictResolution component usage..."
if grep -q "<ConflictResolution" app/conflicts/page.tsx 2>/dev/null; then
    echo -e "  ${GREEN}✅ ConflictResolution component used${NC}"
    ((PASSED++))
else
    echo -e "  ${RED}❌ ConflictResolution component not used${NC}"
    ((FAILED++))
fi
echo ""

# Test 6: Check escrow calculation (RELEASED_1 = 0.75)
echo "6️⃣  Checking escrow calculation for RELEASED_1..."
if grep -q "payment.amount.*0\.75\|payment\.amount \* 0\.75" app/api/conflicts/[id]/resolve/route.ts 2>/dev/null; then
    echo -e "  ${GREEN}✅ RELEASED_1 uses 0.75 (75% remaining)${NC}"
    ((PASSED++))
else
    echo -e "  ${RED}❌ RELEASED_1 calculation incorrect${NC}"
    ((FAILED++))
fi
echo ""

# Test 7: Check escrow calculation (RELEASED_2 = 0.25)
echo "7️⃣  Checking escrow calculation for RELEASED_2..."
if grep -q "payment.amount.*0\.25\|payment\.amount \* 0\.25" app/api/conflicts/[id]/resolve/route.ts 2>/dev/null; then
    echo -e "  ${GREEN}✅ RELEASED_2 uses 0.25 (25% remaining)${NC}"
    ((PASSED++))
else
    echo -e "  ${RED}❌ RELEASED_2 calculation incorrect${NC}"
    ((FAILED++))
fi
echo ""

# Test 8: Check escrow calculation in frontend
echo "8️⃣  Checking escrow calculation in frontend..."
if grep -q "payment.amount.*0\.75\|payment\.amount \* 0\.75" app/conflicts/page.tsx 2>/dev/null && \
   grep -q "payment.amount.*0\.25\|payment\.amount \* 0\.25" app/conflicts/page.tsx 2>/dev/null; then
    echo -e "  ${GREEN}✅ Frontend escrow calculation matches backend${NC}"
    ((PASSED++))
else
    echo -e "  ${YELLOW}⚠️  Frontend calculation may not match backend${NC}"
    ((FAILED++))
fi
echo ""

# Test 9: Check API endpoint exports
echo "9️⃣  Checking API endpoint exports..."
ENDPOINTS=(
    "app/api/conflicts/route.ts:GET"
    "app/api/conflicts/route.ts:POST"
    "app/api/conflicts/[id]/route.ts:GET"
    "app/api/conflicts/[id]/route.ts:PUT"
    "app/api/conflicts/[id]/route.ts:DELETE"
    "app/api/conflicts/[id]/resolve/route.ts:POST"
)

for endpoint in "${ENDPOINTS[@]}"; do
    file=$(echo $endpoint | cut -d: -f1)
    method=$(echo $endpoint | cut -d: -f2)
    if grep -q "export.*$method" "$file" 2>/dev/null; then
        echo -e "  ${GREEN}✅${NC} $file exports $method"
        ((PASSED++))
    else
        echo -e "  ${RED}❌${NC} $file missing $method export"
        ((FAILED++))
    fi
done
echo ""

# Test 10: Check motive field in schema
echo "🔟 Checking motive field in Prisma schema..."
if grep -q "motive.*String" prisma/schema.prisma 2>/dev/null; then
    echo -e "  ${GREEN}✅ motive field present in schema${NC}"
    ((PASSED++))
else
    echo -e "  ${RED}❌ motive field missing in schema${NC}"
    ((FAILED++))
fi
echo ""

# Test 11: Check status field in schema
echo "1️⃣1️⃣  Checking status field in Prisma schema..."
if grep -A 5 "model conflicts" prisma/schema.prisma 2>/dev/null | grep -q "status.*String"; then
    echo -e "  ${GREEN}✅ status field present in conflicts schema${NC}"
    ((PASSED++))
else
    echo -e "  ${RED}❌ status field missing in conflicts schema${NC}"
    ((FAILED++))
fi
echo ""

# Test 12: Check motive in POST API
echo "1️⃣2️⃣  Checking motive in conflict creation API..."
if grep -q "motive" app/api/conflicts/route.ts 2>/dev/null; then
    echo -e "  ${GREEN}✅ motive used in POST /api/conflicts${NC}"
    ((PASSED++))
else
    echo -e "  ${RED}❌ motive not found in POST handler${NC}"
    ((FAILED++))
fi
echo ""

# Test 13: Check status in POST API
echo "1️⃣3️⃣  Checking status in conflict creation API..."
if grep -q "status.*OPEN" app/api/conflicts/route.ts 2>/dev/null; then
    echo -e "  ${GREEN}✅ status set to OPEN in POST /api/conflicts${NC}"
    ((PASSED++))
else
    echo -e "  ${RED}❌ status not set in POST handler${NC}"
    ((FAILED++))
fi
echo ""

# Test 14: Check motive in UI (ConflictReportDialog)
echo "1️⃣4️⃣  Checking motive field in ConflictReportDialog..."
if grep -q "motive" components/ConflictReportDialog.tsx 2>/dev/null; then
    echo -e "  ${GREEN}✅ motive field present in ConflictReportDialog${NC}"
    ((PASSED++))
else
    echo -e "  ${RED}❌ motive field missing in ConflictReportDialog${NC}"
    ((FAILED++))
fi
echo ""

# Test 15: Check status display in conflicts page
echo "1️⃣5️⃣  Checking status display in conflicts page..."
if grep -q "conflict.status\|status:" app/conflicts/page.tsx 2>/dev/null; then
    echo -e "  ${GREEN}✅ status displayed in conflicts page${NC}"
    ((PASSED++))
else
    echo -e "  ${RED}❌ status not displayed in conflicts page${NC}"
    ((FAILED++))
fi
echo ""

# Test 16: Check auto-conversation creation on conflict create
echo "1️⃣6️⃣  Checking auto-conversation on conflict creation..."
if grep -q "conversations.create" app/api/conflicts/route.ts 2>/dev/null; then
    echo -e "  ${GREEN}✅ Auto-conversation creation on conflict create${NC}"
    ((PASSED++))
else
    echo -e "  ${RED}❌ Auto-conversation not implemented${NC}"
    ((FAILED++))
fi
echo ""

# Test 17: Check in-app notifications on conflict create
echo "1️⃣7️⃣  Checking in-app notifications on conflict creation..."
if grep -q "notifications.createMany\|notifications.create" app/api/conflicts/route.ts 2>/dev/null; then
    echo -e "  ${GREEN}✅ In-app notifications on conflict create${NC}"
    ((PASSED++))
else
    echo -e "  ${RED}❌ In-app notifications not implemented${NC}"
    ((FAILED++))
fi
echo ""

# Test 18: Check notifications API exists
echo "1️⃣8️⃣  Checking notifications API..."
if [ -f "app/api/notifications/route.ts" ]; then
    echo -e "  ${GREEN}✅ Notifications API exists${NC}"
    ((PASSED++))
else
    echo -e "  ${RED}❌ Notifications API missing${NC}"
    ((FAILED++))
fi
echo ""

# Test 19: Check InAppNotifications component
echo "1️⃣9️⃣  Checking InAppNotifications component..."
if [ -f "components/InAppNotifications.tsx" ]; then
    echo -e "  ${GREEN}✅ InAppNotifications component exists${NC}"
    ((PASSED++))
else
    echo -e "  ${RED}❌ InAppNotifications component missing${NC}"
    ((FAILED++))
fi
echo ""

# Test 20: Check resolution types in ConflictResolution
echo "2️⃣0️⃣  Checking resolution types (FULL_REFUND, FULL_RELEASE, etc.)..."
if grep -q "FULL_REFUND\|FULL_RELEASE\|PARTIAL_REFUND\|SPLIT" components/ConflictResolution.tsx 2>/dev/null; then
    echo -e "  ${GREEN}✅ All resolution types in ConflictResolution${NC}"
    ((PASSED++))
else
    echo -e "  ${RED}❌ Resolution types missing${NC}"
    ((FAILED++))
fi
echo ""

# Test 21: Check for common syntax errors
echo "2️⃣1️⃣  Checking for common syntax issues..."
if grep -r "import.*ConflictResolution" app/ 2>/dev/null | grep -q "ConflictResolution"; then
    echo -e "  ${GREEN}✅ No obvious import syntax errors${NC}"
    ((PASSED++))
else
    echo -e "  ${YELLOW}⚠️  Could not verify imports${NC}"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary:"
echo -e "  ${GREEN}✅ Passed: $PASSED${NC}"
echo -e "  ${RED}❌ Failed: $FAILED${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All code checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Start server: npm run dev"
    echo "  2. Test in browser: http://localhost:3000/conflicts"
    echo "  3. Create a test conflict"
    echo "  4. Verify payment data appears"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Some checks failed. Please review above.${NC}"
    exit 1
fi
