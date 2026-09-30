# Refund Policy - Overdue Missions

## Overview

This document explains how overdue missions and refunds are handled on the platform.

## ⚠️ Important: No Automatic Refunds

**The platform does NOT automatically process refunds.** All refunds require **admin review and manual approval**.

This policy protects both clients and builders from abuse and ensures fair resolution of disputes.

---

## Mission Status Flow

### 1. IN_PROGRESS → OVERDUE

When a mission's deadline passes:
- Mission status changes from `IN_PROGRESS` to `OVERDUE`
- Builder is notified
- Client is notified
- **No automatic action taken** - just a status change

**Grace Period:**
- 25% of the original timeframe
- Example: 20-day mission = 5-day grace period
- Builder has extra time to complete work

### 2. OVERDUE → Admin Review Required

When grace period ends:
- Mission remains in `OVERDUE` status
- Admin is notified via dashboard
- Mission appears in "Overdue Missions Needing Review" section
- **No automatic refund is processed**

### 3. Admin Review Process

**Admin must manually review each overdue mission:**

1. **Check mission details:**
   - Work completed vs. deadline
   - Communication history
   - Quality of work delivered
   - Reason for delay

2. **Calculate potential refund:**
   - Total mission amount
   - Minus already released milestones
   - = Potential refund amount

3. **Make decision:**
   - **Full refund** - If no work was completed
   - **Partial refund** - If some work was completed
   - **No refund** - If work quality is good, delay was justified
   - **Request dispute** - If situation is unclear

4. **Process refund manually:**
   - Use admin panel to process refund
   - Create refund payment record
   - Update mission status to `REFUNDED`
   - Manually transfer money back to client (for EUR)

---

## Why No Auto-Refunds?

### Protection Against Abuse

1. **Client Abuse:**
   - Clients could delay approvals to trigger refunds
   - Clients could claim delays when work is actually complete
   - Clients could exploit automatic systems

2. **Builder Protection:**
   - Delays might be client's fault (slow feedback, scope changes)
   - Work quality matters more than timing
   - Builders deserve fair evaluation

3. **Fair Resolution:**
   - Each case is unique
   - Context matters (communication, quality, external factors)
   - Human judgment is needed

---

## How It Works

### For Admins

1. **Check Deadlines Button:**
   - Click "Check Deadlines" on admin dashboard
   - System marks overdue missions
   - Shows missions needing review

2. **Review Overdue Missions:**
   - See notifications in dashboard
   - Click "Review refund" for each mission
   - Evaluate case and make decision

3. **Process Refund:**
   - Use `/api/admin/missions/[id]/refund` endpoint
   - Specify refund amount
   - Add reason/notes
   - System creates refund record

### For Clients

1. **Mission becomes overdue:**
   - You'll be notified
   - Mission status changes to `OVERDUE`
   - You can contact admin or builder

2. **After grace period:**
   - Mission needs admin review
   - You can request refund through admin
   - Or use dispute system if needed

3. **Refund processing:**
   - Admin reviews your case
   - Admin decides refund amount
   - Refund is processed manually
   - Money is returned to your account

### For Builders

1. **Mission becomes overdue:**
   - You'll be notified
   - You have grace period to complete work
   - Communicate with client about delays

2. **After grace period:**
   - Mission needs admin review
   - You can explain delays to admin
   - You can dispute if refund is unfair

3. **Protection:**
   - Already released milestones are protected
   - Only unpaid portion can be refunded
   - You can use dispute system

---

## Milestone Protection

**Already released milestones are protected:**

- Milestone 1 (25%) - If released, builder keeps it
- Milestone 2 (50%) - If released, builder keeps it
- Milestone 3 (25%) - If released, builder keeps it

**Only unpaid portion can be refunded:**
- If 50% was released, only remaining 50% can be refunded
- Builder keeps what they already earned

---

## Dispute Resolution

If builder or client disagrees with refund decision:

1. **Use Conflict System:**
   - Create a conflict/dispute
   - Admin reviews both sides
   - Fair resolution is reached

2. **Admin Mediation:**
   - Admin evaluates evidence
   - Considers work quality, communication, delays
   - Makes final decision

---

## API Endpoints

### Check Deadlines
```
POST /api/admin/check-deadlines
```
- Marks overdue missions
- Shows missions needing review
- **Does NOT process refunds**

### Get Overdue Missions
```
GET /api/admin/overdue-missions
```
- Returns missions past grace period
- Includes potential refund amounts
- For admin review

### Process Refund
```
POST /api/admin/missions/[id]/refund
Body: { refundAmount: number, reason?: string }
```
- Processes manual refund
- Creates refund payment record
- Updates mission status

---

## Comparison with Other Platforms

### TopCoder
- Uses penalty system (5% + 1% per hour, max 50%)
- No full refunds for delays
- Quality matters, not just timing

### Upwork/Freelancer.com
- Dispute resolution required
- No auto-refunds
- Admin mediation for refunds
- Partial payments based on work done

### Our Platform (V1)
- **No auto-refunds** (safest approach)
- **Admin review required** (flexible, fair)
- **Dispute system available** (for contested cases)
- **Milestone protection** (builders keep what they earned)

---

## Future Enhancements (V2)

Potential improvements:
- Penalty system (TopCoder-style)
- Automated partial refunds based on delay
- More sophisticated dispute resolution
- Automated notifications and reminders

**For now, manual admin review is the safest and fairest approach.**

---

## Summary

| Aspect | Current Policy |
|--------|----------------|
| **Auto-refunds** | ❌ No |
| **Admin review** | ✅ Required |
| **Grace period** | ✅ 25% of timeframe |
| **Milestone protection** | ✅ Yes |
| **Dispute system** | ✅ Available |
| **Refund processing** | Manual (admin) |

---

**Last Updated:** December 7, 2025  
**Status:** V1 - Manual admin review, no auto-refunds

