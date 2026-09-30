# Refund Process Guide - Step-by-Step Instructions

**Last Updated:** December 7, 2025  
**Status:** V1 - Manual admin review process

---

## Overview

This guide provides detailed step-by-step instructions for processing refunds on the platform. All refunds require **manual admin review and approval** - there are no automatic refunds.

---

## Table of Contents

1. [When Refunds Are Needed](#when-refunds-are-needed)
2. [Refund Process Workflow](#refund-process-workflow)
3. [Step-by-Step Admin Guide](#step-by-step-admin-guide)
4. [Technical Implementation](#technical-implementation)
5. [Refund Calculation](#refund-calculation)
6. [Manual Money Transfer (EUR)](#manual-money-transfer-eur)
7. [Troubleshooting](#troubleshooting)

---

## When Refunds Are Needed

Refunds are considered when:

1. **Mission is OVERDUE** - Deadline has passed
2. **Grace period has ended** - 25% extra time has expired
3. **Work is incomplete** - Builder hasn't delivered
4. **Client requests refund** - Due to quality or other issues
5. **Dispute resolution** - Admin decides refund is appropriate

**Important:** Refunds are **NOT automatic**. Each case requires admin review.

---

## Refund Process Workflow

```
Mission Deadline Passes
    ↓
Mission Status: IN_PROGRESS → OVERDUE
    ↓
Grace Period (25% of timeframe)
    ↓
Grace Period Ends
    ↓
Admin Notification (Dashboard)
    ↓
Admin Reviews Mission
    ↓
Admin Makes Decision
    ↓
Admin Processes Refund (if approved)
    ↓
Mission Status: OVERDUE → REFUNDED
    ↓
Manual Money Transfer (EUR) or Automatic (Crypto)
```

---

## Step-by-Step Admin Guide

### Step 1: Check for Overdue Missions

1. **Navigate to Admin Dashboard**
   - Go to `/dashboard` (as admin)
   - Look for "System Management" section
   - Click **"Check Deadlines"** button

2. **Review Results**
   - System marks missions as `OVERDUE`
   - Shows missions past grace period
   - Displays potential refund amounts
   - **No refunds are processed automatically**

### Step 2: Review Overdue Missions

1. **View Notifications**
   - Check "Overdue Missions Needing Review" card on dashboard
   - See list of missions requiring review
   - Each shows:
     - Mission title
     - Client and builder names
     - Grace period end date
     - Potential refund amount
     - Total paid amount

2. **Click "Review refund"**
   - Opens mission details page
   - Review full mission information

### Step 3: Evaluate the Case

**Check the following:**

1. **Mission Details**
   - Original deadline
   - Grace period end date
   - Days past deadline
   - Mission description and requirements

2. **Work Status**
   - Has work been started?
   - What percentage is complete?
   - Quality of delivered work (if any)
   - Communication history

3. **Payment Status**
   - Total mission amount
   - Milestones already released
   - Amount still in escrow
   - Payment method (EUR or crypto)

4. **Context**
   - Was delay builder's fault?
   - Was delay client's fault? (slow feedback, scope changes)
   - External factors? (illness, emergencies)
   - Communication quality

### Step 4: Make Refund Decision

**Decision Options:**

1. **Full Refund**
   - No work was completed
   - Work quality is unacceptable
   - Builder abandoned project

2. **Partial Refund**
   - Some work was completed
   - Work quality is mixed
   - Partial delivery

3. **No Refund**
   - Work is complete or nearly complete
   - Delay was justified
   - Quality is acceptable
   - Delay was client's fault

4. **Request Dispute**
   - Situation is unclear
   - Need more information
   - Both parties disagree

### Step 5: Process Refund (If Approved)

**Using API Endpoint:**

1. **Call Refund API**
   ```
   POST /api/admin/missions/[missionId]/refund
   Body: {
     "refundAmount": 5000.00,
     "reason": "Work incomplete after grace period"
   }
   ```

2. **System Actions:**
   - Validates refund amount (can't exceed unpaid portion)
   - Creates refund payment record
   - Updates mission status to `REFUNDED`
   - Returns confirmation

3. **Manual Money Transfer (EUR):**
   - Check client's bank account details
   - Transfer money from platform account (BE68 5390 0754 7034)
   - Send refund amount to client
   - Update payment record if needed

4. **Automatic Transfer (Crypto):**
   - If builder was to receive crypto, refund is automatic
   - System sends crypto back to client's wallet
   - Transaction hash is recorded

---

## Technical Implementation

### API Endpoints

#### 1. Check Deadlines
```http
POST /api/admin/check-deadlines
Authorization: Required (Admin only)
```

**What it does:**
- Finds missions past deadline (not yet marked OVERDUE)
- Marks them as `OVERDUE`
- Finds missions past grace period
- Calculates potential refund amounts
- **Does NOT process refunds**

**Response:**
```json
{
  "success": true,
  "message": "Deadline check completed successfully...",
  "results": {
    "overdueMissions": [...],
    "missionsNeedingReview": [...],
    "summary": {
      "totalOverdue": 2,
      "totalNeedingReview": 1,
      "totalPotentialRefund": 5000.00
    }
  }
}
```

#### 2. Get Overdue Missions
```http
GET /api/admin/overdue-missions
Authorization: Required (Admin only)
```

**What it does:**
- Returns missions past grace period
- Includes refund calculation details
- For admin review

**Response:**
```json
[
  {
    "id": "mission-id",
    "title": "Mission Title",
    "deadline": "2025-12-01T00:00:00Z",
    "gracePeriodEnd": "2025-12-06T00:00:00Z",
    "potentialRefundAmount": 5000.00,
    "totalPaid": 0,
    "totalAmount": 10000.00,
    "client": {...},
    "freelancer": {...},
    "currency": {"code": "EUR", "symbol": "€"}
  }
]
```

#### 3. Process Refund
```http
POST /api/admin/missions/[missionId]/refund
Authorization: Required (Admin only)
Content-Type: application/json

Body: {
  "refundAmount": 5000.00,
  "reason": "Optional reason for refund"
}
```

**What it does:**
- Validates refund amount
- Creates refund payment record
- Updates mission status to `REFUNDED`
- Returns confirmation

**Validation:**
- Mission must be in `OVERDUE` status
- Refund amount must be > 0
- Refund amount cannot exceed unpaid portion
- Admin authentication required

**Response:**
```json
{
  "success": true,
  "message": "Refund of €5000.00 processed successfully",
  "refund": {
    "id": "payment-id",
    "amount": 5000.00,
    "missionId": "mission-id",
    "missionTitle": "Mission Title"
  }
}
```

---

## Refund Calculation

### Formula

```
Total Mission Amount = dailyRate × timeframe
Total Paid = Sum of all released milestones
Unpaid Portion = Total Mission Amount - Total Paid
Max Refund = Unpaid Portion
```

### Example

**Mission Details:**
- Daily Rate: €500/day
- Timeframe: 20 days
- Total Amount: €10,000

**Payment Status:**
- Milestone 1 (25%): €2,500 - RELEASED
- Milestone 2 (50%): €5,000 - NOT RELEASED
- Milestone 3 (25%): €2,500 - NOT RELEASED

**Calculation:**
- Total Paid: €2,500
- Unpaid Portion: €10,000 - €2,500 = €7,500
- **Max Refund: €7,500**

**Admin Decision:**
- Full refund: €7,500 (all unpaid portion)
- Partial refund: €3,750 (50% of unpaid)
- No refund: €0

### Milestone Protection

**Important:** Already released milestones are **protected** and cannot be refunded.

- If Milestone 1 (25%) was released → Builder keeps €2,500
- If Milestone 2 (50%) was released → Builder keeps €5,000
- Only **unpaid portion** can be refunded

---

## Manual Money Transfer (EUR)

### For EUR Payments

**Current System:**
- Refund creates database record
- Status changes to `REFUNDED`
- **You must manually transfer money** to client

### Steps

1. **Get Client Bank Details**
   - Check client's profile
   - Find bank account information
   - Verify account details

2. **Transfer Money**
   - Log into platform bank account: `BE68 5390 0754 7034` (KBC Bank NV)
   - Initiate transfer to client's account
   - Amount: Refund amount (e.g., €5,000)
   - Reference: Payment ID or Mission ID

3. **Confirm Transfer**
   - Wait for transfer confirmation
   - Update payment record if needed
   - Notify client (optional)

### Future Enhancement

Consider integrating:
- Bank API for automatic transfers
- Payment gateway (Stripe, PayPal) for refunds
- Automated escrow service

---

## Troubleshooting

### Issue: "Refund amount cannot exceed unpaid portion"

**Cause:** Trying to refund more than what's unpaid

**Solution:**
- Check total paid amount
- Calculate unpaid portion correctly
- Refund only unpaid portion

### Issue: "Mission must be in OVERDUE status"

**Cause:** Mission is not in correct status

**Solution:**
- Run "Check Deadlines" first
- Wait for grace period to end
- Mission must be `OVERDUE` status

### Issue: Refund processed but money not transferred

**Cause:** Database updated but manual transfer not done

**Solution:**
- Check payment record status
- Complete manual bank transfer
- Update payment record if needed

### Issue: Client claims no refund received

**Cause:** Manual transfer not completed or delayed

**Solution:**
- Verify transfer was sent
- Check bank account records
- Confirm client's bank details
- Resend if needed

---

## Best Practices

### For Admins

1. **Review Thoroughly**
   - Check all mission details
   - Review communication history
   - Consider context and circumstances

2. **Document Decisions**
   - Add reason when processing refund
   - Keep notes on why refund was approved/denied
   - Maintain audit trail

3. **Communicate Clearly**
   - Notify client of refund decision
   - Explain refund amount
   - Provide timeline for money transfer

4. **Process Promptly**
   - Review overdue missions regularly
   - Process refunds within 24-48 hours
   - Complete money transfers quickly

5. **Protect Builders**
   - Don't refund already released milestones
   - Consider work quality, not just timing
   - Give builders chance to explain delays

---

## Database Records

### Payment Record Created

When refund is processed, a payment record is created:

```typescript
{
  id: "payment-id",
  amount: 5000.00,
  paymentMethod: "MANUAL_REFUND",
  status: "COMPLETED",
  transactionDate: "2025-12-07T...",
  missionId: "mission-id",
  userId: "client-id",
  currencyId: "eur-currency-id"
}
```

### Mission Status Updated

```typescript
{
  id: "mission-id",
  status: "REFUNDED", // Changed from OVERDUE
  // ... other fields unchanged
}
```

---

## Summary

| Step | Action | Who | When |
|------|--------|-----|------|
| 1 | Check deadlines | Admin | Daily/Weekly |
| 2 | Review overdue missions | Admin | After grace period |
| 3 | Evaluate case | Admin | Per mission |
| 4 | Make decision | Admin | After evaluation |
| 5 | Process refund | Admin | If approved |
| 6 | Transfer money (EUR) | Admin | After processing |
| 7 | Confirm completion | Admin | After transfer |

---

## Related Documentation

- [Refund Policy](./refund-policy.md) - Policy and rules
- [Escrow System](./escrow-system-explained.md) - How escrow works
- [Payment Workflow](./payment-workflow.md) - Payment flow
- [Admin System](./admin-system.md) - Admin features

---

**Last Updated:** December 7, 2025  
**Version:** 1.0  
**Status:** Production Ready

