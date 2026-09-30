# Conflict Resolution System - Manual Testing Guide

## Prerequisites

1. **Database Setup:**
   - Have at least one mission with a contract
   - Have at least one payment in `MADE` status (in escrow)
   - Have test users: client, freelancer, admin

2. **Environment:**
   - Server running (`npm run dev`)
   - Database accessible
   - Admin user logged in (for some tests)

---

## Test Scenario 1: Basic Conflict Creation & Payment Data

### Steps:
1. **Login as Client or Freelancer**
2. **Navigate to a contract page** (`/contracts/[contractId]`)
3. **Click "Report Conflict"**
4. **Fill in conflict description** and submit
5. **Verify conflict appears** in `/conflicts` page

### Expected Results:
- ✅ Conflict created successfully
- ✅ Conflict status is `OPEN`
- ✅ Conflict shows in conflicts list
- ✅ Payment data is included in API response
- ✅ Escrowed amount is displayed correctly

### Verification:
```bash
# Check API response includes payments
curl http://localhost:3000/api/conflicts \
  -H "Cookie: your-auth-cookie" \
  | jq '.[0].contract.missions.payments'
```

**Expected:** Array of payments with `amount`, `status`, etc.

---

## Test Scenario 2: Escrow Calculation - Payment Status MADE

### Setup:
- Create a payment with status `MADE` (full amount in escrow)
- Example: Payment amount = €1000, Status = `MADE`

### Steps:
1. **Create a conflict** for the contract
2. **View conflict** in `/conflicts` page
3. **Check escrowed amount** displayed

### Expected Results:
- ✅ Escrowed amount = €1000.00 (100% of payment)
- ✅ ConflictResolution component shows correct amount

### Verification:
```javascript
// In browser console on conflicts page
const conflict = await fetch('/api/conflicts').then(r => r.json());
const payment = conflict[0].contract.missions.payments[0];
console.log('Payment amount:', payment.amount);
console.log('Payment status:', payment.status);
console.log('Expected escrow:', payment.amount); // Should match
```

---

## Test Scenario 3: Escrow Calculation - Payment Status RELEASED_1

### Setup:
- Have a payment with status `RELEASED_1` (25% released, 75% in escrow)
- Example: Payment amount = €1000, Status = `RELEASED_1`

### Steps:
1. **Create a conflict** for the contract
2. **View conflict** in `/conflicts` page
3. **Check escrowed amount** displayed

### Expected Results:
- ✅ Escrowed amount = €750.00 (75% of €1000)
- ✅ Calculation: 1000 × 0.75 = 750

### Verification:
```javascript
// In browser console
const conflict = await fetch('/api/conflicts').then(r => r.json());
const payment = conflict[0].contract.missions.payments[0];
const expectedEscrow = Number(payment.amount) * 0.75;
console.log('Payment amount:', payment.amount);
console.log('Payment status:', payment.status);
console.log('Expected escrow (75%):', expectedEscrow);
console.log('Actual escrow shown:', /* check UI */);
```

---

## Test Scenario 4: Escrow Calculation - Payment Status RELEASED_2

### Setup:
- Have a payment with status `RELEASED_2` (50% released, 50% in escrow)
- Example: Payment amount = €1000, Status = `RELEASED_2`

### Steps:
1. **Create a conflict** for the contract
2. **View conflict** in `/conflicts` page
3. **Check escrowed amount** displayed

### Expected Results:
- ✅ Escrowed amount = €500.00 (50% of €1000)
- ✅ Calculation: 1000 × 0.50 = 500

### Verification:
```javascript
// In browser console
const conflict = await fetch('/api/conflicts').then(r => r.json());
const payment = conflict[0].contract.missions.payments[0];
const expectedEscrow = Number(payment.amount) * 0.50;
console.log('Payment amount:', payment.amount);
console.log('Payment status:', payment.status);
console.log('Expected escrow (50%):', expectedEscrow);
```

---

## Test Scenario 5: Resolution - FULL_REFUND

### Setup:
- Conflict with payment in escrow (status `MADE` or `RELEASED_1` or `RELEASED_2`)
- Login as Admin or both parties (for peer-to-peer)

### Steps:
1. **Navigate to conflict** in `/conflicts` page
2. **Select "Full Refund to Client"** resolution type
3. **Enter resolution reason**
4. **Click "Resolve Conflict & Process Payments"**

### Expected Results:
- ✅ Conflict status changes to `RESOLVED`
- ✅ `endDate` is set
- ✅ New payment record created with:
  - `status: 'COMPLETED'`
  - `paymentMethod: 'CONFLICT_REFUND'`
  - `amount: [escrowed amount]`
  - `userId: [client id]`
- ✅ Contract status: `isActive: false` (if full refund)
- ✅ Mission status: `CANCELLED` (if full refund)

### Verification:
```sql
-- Check conflict status
SELECT id, status, "endDate" FROM conflicts WHERE id = 'conflict-id';

-- Check refund payment created
SELECT id, amount, status, "paymentMethod", "userId" 
FROM payments 
WHERE "missionId" = 'mission-id' 
  AND "paymentMethod" = 'CONFLICT_REFUND'
ORDER BY "createdAt" DESC 
LIMIT 1;

-- Check contract status
SELECT id, "isActive" FROM contracts WHERE id = 'contract-id';

-- Check mission status
SELECT id, status FROM missions WHERE id = 'mission-id';
```

---

## Test Scenario 6: Resolution - FULL_RELEASE

### Setup:
- Conflict with payment in escrow
- Login as Admin

### Steps:
1. **Navigate to conflict**
2. **Select "Full Release to Builder"** resolution type
3. **Enter resolution reason**
4. **Click "Resolve Conflict & Process Payments"**

### Expected Results:
- ✅ Conflict status: `RESOLVED`
- ✅ New payment record created with:
  - `status: 'RELEASED'`
  - `amount: [escrowed amount]`
  - `userId: [freelancer id]`
- ✅ If freelancer prefers crypto:
  - Crypto payment processed automatically
  - `cryptoTransactionHash` recorded
  - `cryptoAmount`, `cryptoCurrency`, `conversionRate` set

### Verification:
```sql
-- Check release payment
SELECT id, amount, status, "userId", "cryptoTransactionHash", "cryptoAmount"
FROM payments 
WHERE "missionId" = 'mission-id' 
  AND status = 'RELEASED'
ORDER BY "createdAt" DESC 
LIMIT 1;
```

---

## Test Scenario 7: Resolution - PARTIAL_REFUND

### Setup:
- Conflict with €1000 in escrow
- Login as Admin

### Steps:
1. **Navigate to conflict**
2. **Select "Partial Refund"** resolution type
3. **Enter refund amount:** €300
4. **Enter resolution reason**
5. **Click "Resolve Conflict & Process Payments"**

### Expected Results:
- ✅ Conflict status: `RESOLVED`
- ✅ Refund payment created: €300 to client
- ✅ Release payment created: €700 to freelancer
- ✅ Total = €1000 (matches escrowed amount)

### Verification:
```sql
-- Check both payments created
SELECT id, amount, status, "paymentMethod", "userId"
FROM payments 
WHERE "missionId" = 'mission-id' 
  AND "createdAt" > NOW() - INTERVAL '1 minute'
ORDER BY "createdAt" DESC;
```

---

## Test Scenario 8: Resolution - SPLIT

### Setup:
- Conflict with €1000 in escrow
- Login as Admin

### Steps:
1. **Navigate to conflict**
2. **Select "Split Payment"** resolution type
3. **Enter refund amount:** €400
4. **Enter release amount:** €500
5. **Enter resolution reason**
6. **Click "Resolve Conflict & Process Payments"**

### Expected Results:
- ✅ Conflict status: `RESOLVED`
- ✅ Refund payment: €400 to client
- ✅ Release payment: €500 to freelancer
- ✅ Total = €900 (less than escrowed, which is allowed)

### Verification:
```sql
-- Verify amounts
SELECT 
  SUM(CASE WHEN "paymentMethod" = 'CONFLICT_REFUND' THEN amount ELSE 0 END) as total_refund,
  SUM(CASE WHEN status = 'RELEASED' AND "createdAt" > NOW() - INTERVAL '1 minute' THEN amount ELSE 0 END) as total_release
FROM payments 
WHERE "missionId" = 'mission-id' 
  AND "createdAt" > NOW() - INTERVAL '1 minute';
```

---

## Test Scenario 9: Permission Checks

### Test 9a: Client Can't Resolve Alone
1. **Login as Client** (not admin, not both parties)
2. **Try to resolve conflict**
3. **Expected:** Should see message "Only admins or both involved parties can resolve conflicts"

### Test 9b: Freelancer Can't Resolve Alone
1. **Login as Freelancer** (not admin, not both parties)
2. **Try to resolve conflict**
3. **Expected:** Should see message "Only admins or both involved parties can resolve conflicts"

### Test 9c: Admin Can Resolve
1. **Login as Admin**
2. **Try to resolve conflict**
3. **Expected:** Resolution form should be accessible

---

## Test Scenario 10: Crypto Payment Processing

### Setup:
- Freelancer has `preferredPaymentMethod: 'AVAX'` (or BTC, ETH, SOL)
- Freelancer has `cryptoWalletAddress` set
- Platform wallet configured (`PLATFORM_WALLET_PRIVATE_KEY` in env)

### Steps:
1. **Resolve conflict with FULL_RELEASE or PARTIAL_RELEASE**
2. **Check payment record**

### Expected Results:
- ✅ Payment record includes:
  - `cryptoAmount`: Converted crypto amount
  - `cryptoCurrency`: 'AVAX', 'BTC', 'ETH', or 'SOL'
  - `conversionRate`: EUR to crypto rate
  - `cryptoWalletAddress`: Freelancer's wallet
  - `cryptoTransactionHash`: Blockchain transaction hash
- ✅ Actual crypto sent to freelancer's wallet (check blockchain explorer)

### Verification:
```sql
-- Check crypto payment details
SELECT 
  "cryptoAmount", 
  "cryptoCurrency", 
  "conversionRate", 
  "cryptoWalletAddress",
  "cryptoTransactionHash"
FROM payments 
WHERE id = 'payment-id';
```

**Blockchain Verification:**
- For AVAX: Check on [Snowtrace](https://snowtrace.io/) using `cryptoTransactionHash`
- Verify transaction shows correct amount sent to `cryptoWalletAddress`

---

## Test Scenario 11: Edge Cases

### Test 11a: No Payments in Escrow
1. **Create conflict for contract with no payments**
2. **Expected:** Escrowed amount = €0.00
3. **Try to resolve:** Should show error or handle gracefully

### Test 11b: Multiple Payments
1. **Create conflict for contract with multiple payments in escrow**
2. **Expected:** Escrowed amount = sum of all escrowed payments
3. **Resolve:** Should process correctly

### Test 11c: Invalid Amounts
1. **Try to resolve with refund + release > escrowed amount**
2. **Expected:** Error message "Total resolution amount cannot exceed escrowed amount"

### Test 11d: Negative Amounts
1. **Try to enter negative refund or release amount**
2. **Expected:** Error message "Amounts cannot be negative"

### Test 11e: Resolve Already Resolved Conflict
1. **Try to resolve conflict with status `RESOLVED`**
2. **Expected:** Error message "Conflict cannot be resolved in status: RESOLVED"

---

## 20/80 Automated Tests (Run First)

Before manual testing, run these automated checks:

```bash
# 1. Code-only smoke test (structure, escrow logic, new features)
bash scripts/smoke-test-code-only.sh

# 2. Vitest unit tests (escrow calculation, resolution types)
npm run test:conflicts
```

These cover the critical 20%: file structure, escrow formula, resolution types, auto-conversation, and notifications.

---

## Quick Test Checklist

Use this checklist for quick verification:

- [ ] Conflict creation works
- [ ] Payment data included in API response
- [ ] Escrow calculation correct for `MADE` status
- [ ] Escrow calculation correct for `RELEASED_1` status
- [ ] Escrow calculation correct for `RELEASED_2` status
- [ ] FULL_REFUND resolution works
- [ ] FULL_RELEASE resolution works
- [ ] PARTIAL_REFUND resolution works
- [ ] SPLIT resolution works
- [ ] Crypto payments processed (if applicable)
- [ ] Permission checks work
- [ ] Edge cases handled

---

## Troubleshooting

### Issue: Payments not showing in API response
**Solution:** Check that payments are included in Prisma query in `/api/conflicts/route.ts`

### Issue: Escrow calculation wrong
**Solution:** Verify calculation logic matches payment status:
- `MADE`: 100% = `amount × 1.0`
- `RELEASED_1`: 75% = `amount × 0.75`
- `RELEASED_2`: 50% = `amount × 0.50`

### Issue: Resolution fails
**Solution:** 
- Check conflict status (must be `OPEN` or `IN_REVIEW`)
- Check user permissions
- Check payment data exists
- Check database logs for errors

### Issue: Crypto payment not processed
**Solution:**
- Verify `PLATFORM_WALLET_PRIVATE_KEY` is set
- Check platform wallet has sufficient balance
- Verify freelancer's `cryptoWalletAddress` is valid
- Check console logs for crypto transaction errors

---

## Notes

- All timestamps are in UTC
- Payment amounts are stored as Decimal in database
- Crypto conversion uses CoinGecko API (cached for 5 minutes)
- Conflict resolution is irreversible (once resolved, can't be changed)

---

**Last Updated:** After conflict resolution implementation
**Status:** Ready for testing
