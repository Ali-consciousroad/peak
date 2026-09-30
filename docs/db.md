# Database, class diagram and data dictionary

I keep the class diagram, the data dictionary and PostgreSQL aligned. The schema is in [`prisma/schema.prisma`](../prisma/schema.prisma) (applied with migrations). I open the tables with `npx prisma studio`.

Other notes: [study.md](./study.md) (where the code lives), [oral-exam-questions.md](./oral-exam-questions.md), [commands.md](./commands.md) (terminal).

How I write cardinalities: **User 0..\* - 1 Role** means many users can share the same role, and each user has exactly one role. The number next to a class is how many of that class you have for one instance of the other.

---

## 1. Stack and what belongs on the diagram

PostgreSQL is the database. Prisma is the ORM. Node.js is the runtime. The app is Next.js.

Class **User** is table **`users`**. In Prisma Studio, names like `users_conflicts_reporterIdTousers` are relation fields (several foreign keys point to `users`). They are not extra classes. Detail in [study.md §2.7](./study.md).

I only draw an association when there is a foreign key or a join table. A check in the API (`if role !== 'admin'`) is authorization, not a link in the model.

A **Notification** is a row in `notifications`. The admin badge that counts unverified missions is not a Notification.

The diagram, the dictionary and Prisma describe the same model. If it is not a column or a foreign key, it is not on the diagram.

---

## 2. User identity

| Column | PK / FK? | Meaning |
|--------|----------|---------|
| `id` | **PK** | UUID of the user in Peak. Foreign keys (`clientId`, `freelancerId`, ...) point here. |
| `clerkId` | unique, not a FK | Clerk id (`user_...`). After `auth()` I look up our row with this value. |
| `email` | unique | Copy of the Clerk email at onboarding. |
| `password` | leftover | Login goes through Clerk. This column is not used to sign in. |
| `roleId` | **FK** to `roles.id` | Exactly one platform role. |

Clerk and PostgreSQL are two systems. Clerk gives `user_abc`, not our UUID. Without `clerkId` I could not attach the session to a `users` row. I did not use the Clerk id as primary key so the rest of the schema does not depend on the auth provider.

**Picture** is `String?`: it is a URL (Clerk CDN). I store the address of the file, not the file. That is the usual approach. Without Clerk it would still be a String (path or URL on our side), not a BLOB.

On the class I added Email, Description, Picture and ClerkId as String. PreferredPaymentMethod is a separate User attribute (EUR vs crypto). The crypto address in PostgreSQL is `cryptoWalletAddress` (the diagram can still say WalletAddress). I dropped the leftover `walletAddress` column so there is only one wallet field.

The class identifier is `id`. `clerkId` is not a second primary key and not a foreign key. Email and picture are a copy and a URL. Password and the image file stay with Clerk.

---

## 3. User and Role

**User 0..\* - 1 Role** (`roleId` required). One user, one platform role (`client`, `freelance`, `admin`). Many people can be clients.

Client vs builder on a job is Create Mission / Offer, not a second row in `roles`.

---

## 4. Mission and User (Create vs Validate)

There are two foreign keys, so two associations. I do not merge them into 0..2.

| Association | FK | Cardinality | Why |
|-------------|-----|-------------|-----|
| **Create** | `clientId` required | **Mission 0..\* - 1 User** | The client is set when the mission is inserted. There is no pending state for "who posted this". |
| **Validate** | `verifierId` optional | **Mission 0..\* - 0..1 User** | Until an admin validates: `isVerified = false` and `verifierId` is null. At most one admin. One admin can validate many missions (0..\* next to Mission). |

Mission also has `isVerified` (Boolean). The admin UI counts the false ones. The builder is not on Mission; the builder is on Offer.

Create always has one client. Validate has zero or one admin.

---

## 5. Contract, User and Conflict

**Contract 1 - 0..\* Conflict** (1 next to Contract, 0..\* next to Conflict).

- A conflict always has a contract (`contractId` required).
- A contract can have zero or several conflicts.

**Contract 0..\* - 2 User (Sign):** the two FKs on `contracts` are `freelancerId` (builder) and `adminId`. That is not client + builder. The client is `missions.clientId` (Contract → Mission → User).

In the product there are three people (client, builder, admin). On the Contract table there are two User foreign keys.

There is no Conflict - Conflict link in the database (no parent foreign key).

**Conflict 0..\* - 1 User (Report):** `reporterId` required. Who signalled the dispute. **Conflict 0..\* - 0..1 User (Solve):** `assignedAdminId` optional. Client and builder are on Mission / Contract, not extra FKs on Conflict.

---

## 6. Notification and the mission badge

A Notification is a row in `notifications` (`type`, `title`, `message`, `readAt`, optional `conflictId` / `missionId`). The inbox UI is `InAppNotifications`.

### When a conflict is reported

Reporting a dispute is an alert. `POST` `app/api/conflicts` uses `prisma.$transaction` (a SQL transaction, not blockchain): Conflict + group Conversation + `notifications` (`conflict_created`). If the inbox was not written, the conflict could exist without anyone seeing it.

**Conflict 0..1 - 1..\* Notification:** a conflict has at least one notification. A payment notification can have no conflict (`conflictId` optional).

### When a mission is created

`POST` `/api/missions` inserts the mission with `isVerified = false`. There is no `notifications.create`. The admin sees a badge: a count of unverified missions. The file `MissionVerificationNotification.tsx` is a widget, not the Notification class.

**Mission 0..1 - 0..\* Notification:** no row at create. Later events can set `missionId`.

I did not force Mission to 1..\* to look like Conflict. A Notification means "look at this now". A new listing is a moderation queue. Creating fake inbox rows would not match how the product works.

| Event | Row in `notifications`? | `missionId`? |
|-------|-------------------------|--------------|
| Create mission | No | - |
| Admin verify mission | No | - |
| Admin badge | No (computed) | - |
| Conflict reported | Yes (`conflict_created`) | often yes |
| Conflict resolved | Yes (`conflict_resolved`) | yes |
| Payment / milestone released | Yes (`payment_released` / `milestone_released`) | yes |
| Admin payout completed | Yes (`payout_completed`) | yes |
| Payout required (admins) | Yes (`payout_action_required`) | yes |

The dispute writes the inbox in the same SQL transaction. Creating a mission does not; the badge uses `isVerified`. A mission only appears on a Notification later (payment, conflict).

More detail: [study.md §12.1](./study.md).

---

## 7. Message, Notification and Conversation

- A Message is a chat line in a Conversation (`messages`). It only has `conversationId` (not a direct FK to Mission, Contract or Conflict).
- Conversation has optional `missionId` and `conflictId`. Offer chat sets the mission. Reporting a conflict sets conflictId only.
- **Mission 0..1 - 0..\* Conversation** (a conversation can exist without a mission).

---

## 8. Category: permission and optional creator

An admin can create a category (`POST /api/categories`, role check). **Category 0..\* – 0..1 User (Create)** is `createdById` (optional). Seed and older rows have no creator. New admin creates set `createdById`.

Category is also many-to-many with Mission and Skill. The role check stays: only an admin can POST. The FK is who created it when we know, not a required owner.

---

## 9. Skills

**Have: User 0..\* – 0..\* Skill** is the many-to-many (`_UserSkills`). A freelancer adds an existing catalog name to their profile (`POST /api/skills`). A client can have zero skills.

**Create: Skill 0..\* – 0..1 User** is `createdById` (optional), same pattern as Category. Seed skills stay null. `POST /api/admin/skills` sets `createdById`. Freelance POST does not insert a `skills` row.

There is no `users.skill` String. Skills are the Skill class and Possess (`_UserSkills`).

---

## 10. Other points vs the schema

| Topic | In the database |
|-------|-----------------|
| Mission - Contract | `contracts.missionId` is unique, so at most one contract per mission |
| Project.picture | `String[]` (several URLs). User.picture is one URL |
| Portfolio | has `name`; User 0..1 Portfolio (`userId` unique) |
| Role | has `description` |
| Offer | no `initiatedBy` (the client always sends the offer) |
| Message | `isRead`; PK `id` and unique `messageId`; Reply = `replyToId` (association, not an attribute to add) |
| ConversationParticipant | no `createdAt` / `updatedAt` |
| Tables we removed | `saved_missions`, `smart_contracts`. Contract (the agreement) stays. The chatbot is an API, not a table |

Payment `currencyId` is optional in Prisma. The create-payment API always sends a currency, so 1 Currency on the diagram is consistent with how we use it.

---

## 11. Questions I want to be able to answer

**Why two ids on User?** `id` is the primary key for our foreign keys. `clerkId` matches what Clerk returns from `auth()`. It is not a foreign key.

**Why is Picture a String?** We store the URL, not the image. Clerk hosts the avatar.

**Why no notification when a mission is created?** The inbox is for urgent events. A dispute is one. A new listing waits for validation (`isVerified`). The badge is not a Notification.

**Why `$transaction` on conflict?** So conflict, group chat and inbox succeed or fail together. It is SQL, not blockchain.

**Can a user have two roles?** No. `roleId` is required. User 0..\* - 1 Role.

**Who is on a contract?** Builder and admin as foreign keys. The client comes from the mission.

**If an admin creates a category or a skill, should I draw User - Category / User - Skill Create?** Yes, **Create 0..1**. Column `createdById` is optional on both. Seed rows stay null. The admin role check is still in the API. **Have** on Skill is a different association (`_UserSkills`).

**What is `users_conflicts_reporterIdTousers` in Studio?** Prisma needs a name because two FKs point to User. On the diagram I use Report / Solve. Columns: `reporterId` (required), `assignedAdminId` (optional). Conflict has no Creator string in the database.

---

## 12. Choices I kept on purpose

I do not insert Notification rows on mission create only to put 1..\* on Mission.

`createdById` on Category and Skill is optional (0..1). I do not backfill seed rows.

Clerk is not a class. `clerkId` is an attribute.

I do not store images as `bytea` to give Picture another type.
