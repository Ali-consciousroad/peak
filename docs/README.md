# Conflict Resolution System - Documentation

Complete guide to the conflict resolution system for the freelance marketplace.

---

## Table of Contents

1. [Overview](#overview)
2. [Workflow](#workflow)
3. [Escrow Calculation](#escrow-calculation)
4. [Testing Guide](#testing-guide)
5. [Technical Notes](#technical-notes)

---

## Overview

The conflict resolution system allows disputes between clients and freelancers to be resolved with **minimal admin involvement**. It supports:

- **Peer-to-peer resolution** (both parties agree together)
- **Admin resolution** (admin decides)
- **Automated payment processing** (refunds/releases handled automatically)
- **Crypto payment support** (AVAX, BTC, ETH, SOL)

### Key Features

- ✅ Minimal admin involvement
- ✅ Automated payment processing
- ✅ Crypto payments supported
- ✅ Peer-to-peer resolution possible
- ✅ Multiple resolution types (FULL_REFUND, FULL_RELEASE, PARTIAL_REFUND, SPLIT)

---

## Workflow

### Step 1: Conflict Creation

**Who can create:** Client, Freelancer, or Admin

**How:**
1. Navigate to a contract page (`/contracts/[contractId]`)
2. Click "Report Conflict" button
3. Fill in conflict description (motive)
4. Submit

**What happens:**
- Conflict record created with status `OPEN`
- Admin auto-assigned (round-robin, if enabled)
- Conflict appears in `/conflicts` page
- Both parties notified

### Step 2: Escrow Calculation

The system automatically calculates how much money is held in escrow:

- Finds all payments for the mission with status: `MADE`, `RELEASED_1`, or `RELEASED_2`
- Calculates remaining escrow based on payment status:
  - `MADE`: 100% in escrow
  - `RELEASED_1`: 75% in escrow (25% already released)
  - `RELEASED_2`: 25% in escrow (75% already released)

**Example:**
```
Payment: €1000, Status: RELEASED_1
Escrow = €1000 × 0.75 = €750
```

### Step 3: Conflict Resolution

**Who can resolve:**
- **Admin** (can always resolve)
- **Both parties together** (peer-to-peer, mutual agreement)

#### What is Peer-to-Peer Resolution?

**Peer-to-peer resolution** means the **client and freelancer agree together** on how to resolve the conflict **without needing an admin to decide**.

**How it works:**
1. Client and freelancer discuss the conflict
2. They agree on a resolution type
3. One party submits the resolution with `mutualAgreement: true` checked
4. System verifies both parties are involved
5. Payments are processed automatically - no admin needed!

**Benefits:**
- ✅ Faster resolution (no waiting for admin)
- ✅ More decentralized (parties control their dispute)
- ✅ Less admin workload
- ✅ Better user experience

#### Resolution Types

**A. FULL_REFUND**
- Refund all escrowed funds to client
- When: Client is right, freelancer didn't deliver
- Result: Client gets full refund, freelancer gets nothing, contract inactive

**B. FULL_RELEASE**
- Release all escrowed funds to freelancer
- When: Freelancer delivered, client issue resolved
- Result: Freelancer gets all escrow, client gets nothing, contract continues

**C. PARTIAL_REFUND**
- Refund part to client, release rest to freelancer
- When: Partial delivery, both parties share responsibility
- Result: Split automatically (e.g., €300 refund + €700 release)

**D. SPLIT**
- Custom split between client and freelancer
- When: Complex situation requiring custom distribution
- Result: Client gets specified refund, freelancer gets specified release

### Step 4: Payment Processing

**What happens automatically:**

1. **Refund Processing:**
   - New payment record created
   - Status: `COMPLETED`
   - Payment method: `CONFLICT_REFUND`
   - Amount: Refund amount
   - User: Client

2. **Release Processing:**
   - New payment record created
   - Status: `RELEASED`
   - Amount: Release amount
   - User: Freelancer

3. **Crypto Payments (if applicable):**
   - If freelancer prefers crypto (AVAX, BTC, ETH, SOL):
     - EUR converted to crypto using CoinGecko API
     - Crypto sent automatically via blockchain
     - Transaction hash recorded
     - No manual action needed!

4. **Contract/Mission Updates:**
   - If FULL_REFUND: Contract inactive, mission cancelled
   - If other types: Contract continues

### Step 5: Conflict Closure

**What happens:**
- Conflict status: `RESOLVED`
- `endDate` set to current time
- All parties notified
- Conflict archived (can be viewed but not modified)

---

## Escrow Calculation

### Understanding Payment Statuses

The original payment record's `amount` field represents the **total payment amount** and **never changes**, even as milestones are released. Only the `status` field changes to track progress.

### Calculation Formula

```typescript
function calculateEscrowedAmount(payment) {
  if (payment.status === 'MADE') {
    // 100% still in escrow
    return payment.amount × 1.0;
  } else if (payment.status === 'RELEASED_1') {
    // 75% still in escrow (25% released)
    return payment.amount × 0.75;
  } else if (payment.status === 'RELEASED_2') {
    // 25% still in escrow (75% released)
    return payment.amount × 0.25;
  } else if (payment.status === 'COMPLETED') {
    // 0% in escrow (100% released)
    return 0;
  }
}
```

### Summary Table

| Payment Status | % Released | % In Escrow | Calculation |
|---------------|------------|-------------|-------------|
| `MADE` | 0% | 100% | `amount × 1.0` |
| `RELEASED_1` | 25% (milestone 1) | 75% | `amount × 0.75` |
| `RELEASED_2` | 75% (milestone 1 + 2) | 25% | `amount × 0.25` |
| `COMPLETED` | 100% (all milestones) | 0% | `0` |

### Example

**Scenario:** Client pays €2000, conflict occurs after milestone 1 is released

```
Original Payment:
- amount: €2000
- status: RELEASED_1
- Meaning: 25% (€500) released, 75% (€1500) still in escrow

Conflict Resolution:
- Escrowed amount = €2000 × 0.75 = €1500
- Can refund up to €1500 to client
- Can release up to €1500 to freelancer
- Or split: e.g., €500 refund + €1000 release = €1500 total
```

---

## Testing Guide

### Quick Test (5 minutes)

1. **Create a Conflict**
   - Login as Client or Freelancer
   - Go to Contracts → Open a contract
   - Click "Report Conflict"
   - Fill in description and submit

2. **Check Payment Data**
   - Open DevTools (F12) → Network tab
   - Refresh conflicts page
   - Check `/api/conflicts` response
   - Verify `payments` array exists

3. **Check Escrow Calculation**
   - Look at conflict card
   - Find "Total Escrowed" amount
   - Verify amount matches calculation:
     - `MADE`: Full amount
     - `RELEASED_1`: Amount × 0.75
     - `RELEASED_2`: Amount × 0.25

4. **Resolve Conflict (Admin)**
   - Login as Admin
   - Go to Conflicts page
   - Click on conflict
   - Select resolution type (e.g., "Full Refund to Client")
   - Enter reason and resolve
   - Verify status changed to "Resolved"

### Full Test Scenarios

For comprehensive testing, see:
- **Quick Manual Testing:** `scripts/test-conflict-resolution.md`
- **Smoke Test Script:** `scripts/smoke-test-code-only.sh`

### Test Checklist

**Basic Functionality**
- [ ] Can create conflict
- [ ] Conflict appears in list
- [ ] Payment data in API response
- [ ] Escrow amount displayed correctly

**Resolution Types**
- [ ] FULL_REFUND works
- [ ] FULL_RELEASE works
- [ ] PARTIAL_REFUND works
- [ ] SPLIT works

**Escrow Calculations**
- [ ] MADE status: 100% escrow
- [ ] RELEASED_1 status: 75% escrow
- [ ] RELEASED_2 status: 25% escrow

**Permissions**
- [ ] Client can't resolve alone
- [ ] Freelancer can't resolve alone
- [ ] Admin can resolve
- [ ] Both parties can resolve together (mutual agreement)

**Payment Processing**
- [ ] Refund payments created
- [ ] Release payments created
- [ ] Crypto payments processed (if applicable)

### Troubleshooting

**Issue: Payments not showing in API**
- Verify payments are included in Prisma query
- Check payment status is `MADE`, `RELEASED_1`, or `RELEASED_2`
- Check browser Network tab for API response

**Issue: Escrow calculation wrong**
- Verify payment status
- Verify calculation: `MADE × 1.0`, `RELEASED_1 × 0.75`, `RELEASED_2 × 0.25`
- Check browser console for errors

**Issue: Resolution fails**
- Conflict status must be `OPEN` or `IN_REVIEW`
- User must be admin or involved party
- Payment data must exist
- Check server logs for errors

**Issue: Crypto payment not processed**
- `PLATFORM_WALLET_PRIVATE_KEY` set in environment
- Platform wallet has sufficient balance
- Freelancer's `cryptoWalletAddress` is valid
- Check server logs for crypto transaction errors

---

## Technical Notes

### Prisma Model Naming

**Important:** The Prisma schema uses **plural** model names, so code must use plural names too.

**Schema:**
```prisma
model users { ... }
model conflicts { ... }
model contracts { ... }
model missions { ... }
model payments { ... }
```

**Code (Correct):**
```typescript
await prisma.users.findMany()
await prisma.conflicts.create()
await prisma.contracts.findUnique()
await prisma.missions.update()
await prisma.payments.delete()
```

**Code (Wrong - will cause errors):**
```typescript
await prisma.user.findMany()      // ❌ Error: Property 'user' does not exist
await prisma.conflict.create()    // ❌ Error: Property 'conflict' does not exist
```

**Why:** The schema defines `model users`, so Prisma generates `prisma.users`. Using singular names causes runtime errors.

### Conflict Attributes

**Database Schema:**
```prisma
model conflicts {
  id              String    @id
  status          String
  motive          String
  startDate       DateTime
  endDate         DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime
  contractId      String
  reporterId      String    // who reported (FK → User)
  assignedAdminId String?
}
```

**Note on "Creator":** There is no Creator string on Conflict. **Report** is `reporterId` (required FK to User). This is better design because:
- ✅ Can access full user data (name, email, etc.)
- ✅ Maintains referential integrity
- ✅ If user updates name, conflict shows updated name
- ✅ Follows database normalization

### API Endpoints

- `GET /api/conflicts` - List all conflicts (filtered by user)
- `POST /api/conflicts` - Create new conflict
- `GET /api/conflicts/[id]` - Get conflict details
- `PUT /api/conflicts/[id]` - Update conflict
- `DELETE /api/conflicts/[id]` - Delete conflict
- `POST /api/conflicts/[id]/resolve` - Resolve conflict and process payments
- `POST /api/conflicts/[id]/mutual-agreement` - Peer-to-peer resolution

### Frontend Components

- `app/conflicts/page.tsx` - Main conflicts page
- `components/ConflictResolution.tsx` - Resolution form component
- `components/ConflictReportDialog.tsx` - Conflict creation dialog
- `components/ConflictMessaging.tsx` - Conflict messaging component

---

## Summary

The conflict resolution workflow:
1. **Create** → User reports conflict
2. **Calculate** → System calculates escrow
3. **Resolve** → Admin or parties decide resolution
4. **Process** → Payments automatically processed
5. **Close** → Conflict marked resolved

**Key Features:**
- ✅ Minimal admin involvement
- ✅ Automated payment processing
- ✅ Crypto payments supported
- ✅ Peer-to-peer resolution possible
- ✅ Multiple resolution types

---

**Last Updated:** After conflict resolution implementation  
**Status:** Ready for production
