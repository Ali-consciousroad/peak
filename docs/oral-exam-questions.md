# Oral exam questions (flashcard source)

Practice file for the ~30 min defence. **Front of card = question. Back = short answer.**

Do not read the answers first. Cover them, speak, then check.

Related: [README.md](../README.md) (architecture closer, Message vs Notification), [docs/study.md](./study.md) (code map), [docs/db.md](./db.md) (diagram = dictionary = DB), [docs/commands.md](./commands.md) (terminal).

---

## Easy

### E1. What is this application, and who are the three kinds of users?

**Answer:** Freelance marketplace: clients post missions, builders (freelancers) apply and get paid, admins verify missions and help with conflicts. Support exists in `roles` but is secondary.

**Tech one-liner:** Next.js (React, App Router) + Prisma + PostgreSQL. Node.js is the *runtime*, Prisma is the *ORM* (not the database). Login is Clerk.

---

### E2. A client clicks “Create Mission” on the dashboard. Where is the database write?

**Answer:** Dashboard only **navigates** (`router.push('/missions/new')` in `app/dashboard/page.tsx`). The form is `app/missions/new/page.tsx`. Submit: `fetch("/api/missions", { method: "POST" })`. Insert: `POST` in `app/api/missions/route.ts` → Prisma.

**Trap:** “It happens in the React page / dashboard.” The page is UI; the API writes to PostgreSQL.

---

### E3. Why Clerk? What links Clerk to *our* `users` table?

**Answer:** Clerk authenticates (session, password). We do not use `users.password` to sign in. We store **`users.clerkId`** (unique). APIs: `auth()` → `findUnique({ where: { clerkId: userId } })`. Platform role: `roleId` → `roles` (exactly one role per user).

**Inspect DB:** `npx prisma studio` → table `users` → `email`, `clerkId`, `roleId`.  
Also: `npx prisma migrate status`.

---

### E4. Difference between Message and Notification?

**Answer:**
- **Message** = chat line a **user** types in a **Conversation** (`messages`). Screen: `/messages`.
- **Notification** = **system inbox** row (`notifications`). Written by the app (conflict, payment, payout). Screen: `InAppNotifications`.

**Trap:** “Notification when a mission is created.” False. Mission create does **not** insert `notifications`. Admin sees a **badge** (`isVerified = false`).

---

### E5. How do you open the database tables from the terminal?

**Answer:** `npx prisma studio` (browser GUI). Optional: `psql "$DATABASE_URL" -c '\dt'` then `SELECT email, "clerkId", "roleId" FROM users LIMIT 10;`

---

### E6. Where are demo / fake user emails listed?

**Answer:** README **Test Users**; also `prisma/seed.ts`. Passwords are in **Clerk**, not in seed. “Database only” = row exists after seed but you need a matching Clerk account + `clerkId`.

---

## Medium

### M1. How many platform roles can one user have *today*? Cardinality on the class diagram?

**Answer:** **Exactly one** (`users.roleId` required). Diagram: **User 1 — Role**. Signup always connects `client` or `freelance`. Admin *has* the `admin` role (not “no role”). Client vs builder *behaviour* is also Mission/Offer, but the `roles` table is still one row.

---

### M2. A conflict is reported. Three DB writes? Which file? Why `$transaction`?

**Answer:** File: `POST` `app/api/conflicts/route.ts`.
1. **Conflict**
2. **Conversation** + participants (client, freelancer, admin)
3. **Notification** rows (`type: conflict_created`)

`$transaction` = SQL transaction (not blockchain): all succeed or all roll back. Diagram: **Conflict 0..1 — 1..\* Notification**. Search the file for `$transaction`.

UI that *calls* the API: `components/ConflictReportDialog.tsx` (does not write Prisma itself).

---

### M3. Why ConversationParticipant, not only User—Message?

**Answer:** A conversation has **several users**. Participant row = membership + **`lastReadAt`** (when *I* last read this thread) + `isActive`. Messages belong to the **conversation**, not only to a pair of users. 1:1 chat still has **two** participant rows; conflict chat often **three**.

---

### M4. Mini modify: “Show something extra on the dashboard Create Mission area.” Page or API?

**Answer:** **Page first** — `app/dashboard/page.tsx` (UI). API only if you need **new data** from the server. Create Mission itself is a **link**, not an API call.

---

### M5. `status` vs `isVerified` on Mission?

**Answer:**
- **status** = lifecycle: `OPEN`, `IN_PROGRESS`, `COMPLETED`, `REFUNDED`, …
- **isVerified** = admin approved the listing (`false` until `POST` `app/api/missions/[id]/verify/route.ts`)

A mission can be `OPEN` and still not verified.

---

### M6. Message vs Notification vs admin verification badge?

**Answer:**
| | Table / field | Who writes it |
|--|----------------|---------------|
| Message | `messages` | User in a chat |
| Notification | `notifications` | The application |
| Badge | `missions.isVerified` | Nobody “inserts an alert”; UI counts unverified missions |

File `MissionVerificationNotification.tsx` is a **widget**, not the Notification class.

---

### M7. Why was `saved_missions` removed?

**Answer:** Unused bookmark. No save UI. `/missions` lists own/involved missions only. Not on the class diagram. Drop migration `20260521120000_drop_saved_missions`. Do **not** put `saved` on Mission (that would be global, not per user).

---

### M8. Why was `smart_contracts` (table) removed? Is Contract gone?

**Answer:** Blockchain *table* unused for V1; escrow uses **`payments`**. Drop migration `20260521130000_drop_smart_contracts`. **Contract** (agreement client–builder) **stays**. Chatbot is an API, not a table.

---

### M9. Prisma Studio shows `users` and `users_conflicts_reporterIdTousers` — missing User class?

**Answer:** Table **`users`** = diagram class **User**. Long names are **Prisma relations**, not extra classes: two FKs to User (`reporterId`, `assignedAdminId`) cannot both be called `users`. Diagram uses association names (Report / Solve). Full table: [docs/study.md](./study.md) §2.7.

---

## Hard

### H1. Client accepts an offer. What happens in the DB? Which file?

**Answer:** `PATCH` `app/api/offers/[id]/route.ts` with status `ACCEPTED`. Creates or re-activates **one contract per mission** (`missionId` unique). Mission → `IN_PROGRESS`. Other pending offers **cancelled**. Search `status === 'ACCEPTED'`.

---

### H2. Mission — Notification: is it “at least one notification per mission”?

**Answer:** **No.** **Mission 0..1 — 0..\* Notification**. Create mission → **zero** inbox rows. Later: payment/conflict/payout may add several. **Conflict** is **1..\*** notifications, not Mission.

---

### H3. Notification `type` — why a field if you already have `title` and `message`?

**Answer:** Stable **event code** (`conflict_created`, `payment_released`, …). UI icons/filters/links. Title/message can change wording. Example: `InAppNotifications` uses `type === 'conflict_created'` for the warning icon.

---

### H4. Conversation without a mission — which user step?

**Answer:** **Report conflict** on a contract → `POST /api/conflicts` creates a conversation with **`conflictId` only** (no `missionId`). Offer “start discussion” uses `POST /api/conversations/start` **with** `missionId`. Diagram: **Mission 0..1 — 0..\* Conversation** (not Mission 1).

---

### H5. `lastReadAt` vs `messages.isRead` vs `notifications.readAt`?

**Answer:**
- `conversation_participants.lastReadAt` — per **user** in this **thread**
- `messages.isRead` — per **message** boolean (bulk-updated when thread opened)
- `notifications.readAt` — inbox item read

Do not put `readAt` on Message.

---

### H6. Teacher: “Change the dashboard button label to ‘Post a job’.” What do you open? What do you *not* touch?

**Answer:** Open `app/dashboard/page.tsx`, find `Create Mission`, change the label. **Do not** change `app/api/missions/route.ts` (no DB/API change).

Follow-up they may add: “Also show unverified count next to it” → then you need data (`useUnverifiedMissions` or `/api/admin/unverified-missions-count`) — that *is* more than a label.

---

### H7. Is this project “Next.js best practice”?

**Answer:** Solid **App Router + Route Handlers + Prisma + Postgres + Clerk**. Most pages are `"use client"` + `fetch('/api/...')`, not React Server Components. Valid v1 architecture; not the latest Next.js tutorial style. Known debt: huge pages, debug routes (`app/debug`, `app/test`), duplicate `lib/db.ts`.

---

### H8. Walk `$transaction` with the laptop. What must you find?

**Answer:** `app/api/conflicts/route.ts` → `prisma.$transaction` → `tx.conflicts.create` → `tx.conversations.create` → `tx.notifications.createMany`. If notifications fail, **no** conflict row remains. Not a blockchain transaction.

---

### H9. Offer `SeenByFreelancerAt` — why a date, not a boolean?

**Answer:** Unseen = `NULL`; seen = timestamp (`new Date()` in `app/api/freelancer/mark-offers-seen/route.ts`). Boolean cannot store *when*. Diagram name may be `SeenByBuilderAt`; DB column is `seenByFreelancerAt`.

---

### H10. If they ask you to add “notify admins when a mission is posted” — what would you change?

**Answer:** Today that is **not** implemented. You would add `notifications.createMany` in `POST` `app/api/missions/route.ts` (one row per admin). Then the diagram could become Mission **1..\* Notification**. Until then, keep **0..\***. Do not confuse with the verification **badge**.

---

## Suggested 30-minute run

| Minutes | Use |
|---------|-----|
| 0–8 | Easy E1–E4 out loud |
| 8–18 | Medium M1–M3, M5–M6 |
| 18–28 | Hard H1, H2, H8 with files open |
| 28–30 | H6 or H7 (modify / best practice) |

After you can answer without the back of the card, split each `###` into a real flashcard (question / answer).
