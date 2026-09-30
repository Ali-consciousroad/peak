# Oral Q&A — diagram vs product (TFE)

Short answers if the teacher asks *why* the class diagram or User ids look the way they do.

- Q1 (Notification cardinalities): [study.md](./study.md) §12.1, [db.md](./db.md) §6, [oral-exam-questions.md](./oral-exam-questions.md) H2 / E4
- Q2 (ClerkId / two ids): [study.md](./study.md) §11.1, [db.md](./db.md) §2, [oral-exam-questions.md](./oral-exam-questions.md) E3
- Q3 (`gracePeriodEnd`): [study.md](./study.md) §14.1

---

## 1. Why are the cardinalities different on the **Notification** side: Mission **0..\*** vs Conflict **1..\***?

**Diagram**

- **Mission 0..1 – 0..\* Notification** (Trigger)
- **Conflict 0..1 – 1..\* Notification** (Trigger)

**0..1** next to Mission / Conflict: `notifications.missionId` and `conflictId` are **optional**. A payment alert can have a mission and no conflict.

**On the Notification side the numbers differ because of how we *write* the inbox, not because of a drawing mistake.**

### Conflict → **1..\***

Reporting a dispute **always** inserts inbox rows. `POST /api/conflicts` uses `prisma.$transaction`: Conflict + Conversation + `notifications` (`type: conflict_created`). If the inbox failed, the conflict could exist with nobody seeing it. So a conflict that exists in the product has **at least one** Notification.

### Mission → **0..\***

Creating a mission **does not** insert `notifications`. `POST /api/missions` only inserts the mission with `isVerified = false`. The admin sees a **badge**: a **count** of unverified listings (UI, e.g. `MissionVerificationNotification.tsx`). That is **not** the Notification class.

A mission **can** get Notifications **later** (`missionId` set) for urgent events:

| Event | `type` (examples) |
|-------|-------------------|
| Conflict reported / resolved | `conflict_created`, `conflict_resolved` |
| Client releases payment / milestone | `payment_released`, `milestone_released` |
| Admin must send the off-chain payout | `payout_action_required` |
| Admin marks payout done | `payout_completed` |

Funding escrow (payment created / `MADE`) and **Check Deadlines** (`status` → `OVERDUE`) do **not** write inbox rows in this app.

So a mission often starts with **zero** Notifications, then **several**. That is **0..\***, not **1..\***.

### Why two mechanisms (badge vs inbox)?

A **Notification** is an **event** (“look now”): `type`, `title`, `message`, `readAt`.  
The **badge** is **current state**: how many rows still have `isVerified = false`. When an admin verifies, the count drops; there is no row to mark as read.

We did **not** insert a Notification on mission create just to put **1..\*** on Mission. That would spam the inbox and duplicate `isVerified`. Conflict is an alert for several people; a new listing is a moderation queue.

**Say this (FR):** *Sur le diagramme, Conflict 1..\* parce que le signalement écrit toujours l’inbox dans la même transaction SQL. Mission 0..\* parce que la création n’écrit aucune Notification : l’admin a un badge sur isVerified. Plus tard, conflit ou paiement peuvent poser missionId sur de vraies Notifications.*

**EN:** *Conflict is 1..\* because a report always writes inbox rows in the same SQL transaction. Mission is 0..\* because create writes no Notification; the admin badge is a count of isVerified. Later, conflict or payment may set missionId on real inbox rows.*

**Do not change** mission-create to use `notifications` for V1 unless the teacher requires one inbox for everything. Unifying is a product choice, not a bug in the diagram.

---

## 2. Why did you use ClerkId? Why does the User class have two ids, and how are they connected?

They are **not** two primary keys. **UserId (`id`)** is the only PK. **ClerkId** is a unique **attribute** (external id from Clerk), like Email.

**Two systems**

- **Clerk** = identity for v1: sign-up, session, e-mail. We use the Clerk API.
- **PostgreSQL** = Peak **profile** (name, role, missions, …).

**Clerk gère :**

- inscription et connexion (formulaires, mot de passe haché) ;
- session (rester connecté, cookie, déconnexion) ;
- e-mail (vérifier l’adresse, réinitialiser le mot de passe) ;
- compléments (synchronisation de la photo de profil).

**Lien après login**

1. `auth()` returns Clerk’s id (`user_…`).
2. `findUnique({ where: { clerkId: userId } })` finds our `users` row.
3. From then on, every FK in PostgreSQL uses **`users.id`** (`clientId`, `reporterId`, …), never `clerkId`.

```
Compte Clerk  --clerkId (unique)-->  ligne users (PK = id)  --id-->  missions, contracts, …
```

We did **not** use Clerk’s id as PK so the rest of the schema does not depend on the auth provider. There is no `clerk` table, so `clerkId` is **not** a foreign key.

**Say this (FR):** *On n’a pas deux clés primaires. UserId est la PK de Peak. ClerkId est l’identifiant Clerk, unique, seulement pour retrouver la ligne après login. Clerk gère l’identité ; PostgreSQL garde le profil. Les autres tables sont liées par UserId.*

**EN:** *Not two primary keys. UserId is Peak’s PK. ClerkId is Clerk’s unique id, used only after login to find that row. Clerk handles identity; PostgreSQL stores the profile. Other tables FK to UserId.*

---

## 3. How does `gracePeriodEnd` work? Does the app auto-refund? What does OVERDUE mean?

**OVERDUE = the work is late**, not “a payment is overdue.” It is `missions.status`. Check Deadlines marks a mission still `IN_PROGRESS` whose **work `deadline`** (start + duration in days) has passed. Payments keep their own statuses (`MADE`, `RELEASED_1`, …). There is no `OVERDUE` on Payment. After `gracePeriodEnd`, the admin may **review a refund** of money still in escrow — that is a consequence of late work, not a second meaning of OVERDUE.

**No automatic refund in the web app.** `gracePeriodEnd` is a **stored date** on Mission, used to build an **admin review list**.

**How the date is set** (at create, `POST /api/missions`):

1. `deadline` = start date + `timeframe` (days).
2. Grace length = **25 %** of `timeframe` (`Math.ceil(timeframe * 0.25)` days).
3. `gracePeriodEnd` = `deadline` + those days.

Example: 20-day mission → grace = 5 days after the deadline.

**Two clocks, one admin button** (`POST /api/admin/check-deadlines`, dashboard **Check Deadlines** — not a cron):

| When | What is written |
|------|-----------------|
| Mission `IN_PROGRESS` and **past `deadline`** | `status = OVERDUE` |
| Mission already `OVERDUE` and **past `gracePeriodEnd`** | Listed as **needs review** (potential unpaid remainder). **No** payment update |

There is **no** `isOverdue` or `autoRefundEnabled` column. Late work is only `status = OVERDUE`. V1 never auto-refunds. After grace, the queue is `OVERDUE` + `gracePeriodEnd`. The admin still chooses refund / none, or a **conflict** for escrow / a larger split.

The overdue **badge** counts the same filter (`OVERDUE` + `gracePeriodEnd` ≤ now). Not a Notification.

**Say this (FR):** *OVERDUE = le travail a dépassé sa deadline, pas « le paiement est en retard ». gracePeriodEnd = deadline + 25 % de la durée, à la création. Check Deadlines (bouton admin, pas un cron) passe en OVERDUE après la deadline. Après la grâce, file d’examen. Aucun remboursement automatique : l’admin décide.*

**EN:** *OVERDUE means the job missed its work deadline, not that a payment is late. gracePeriodEnd is deadline plus 25% of duration, set at create. Check Deadlines (admin button, not a cron) marks OVERDUE after the deadline. After the grace date, review only. No auto-refund; the admin decides.*
