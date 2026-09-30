## Chatbot Knowledge Base

Use this file as the single source of truth for chatbot answers. Keep it concise, user‑facing, and accurate.

**Setup and modes** (Ollama, env vars, `rules` / `llm` / `hybrid`): see the **Chatbot (FAQ + LLM)** section in the repo root [`README.md`](../README.md).

### Platform Summary
- Peak is a freelance marketplace connecting **clients** and **builders**.
- **Admins** verify content and can resolve conflicts.

### Roles & Access
- **Client**: Create missions, send offers to builders, hire, manage contracts.
- **Builder**: Receive offers, deliver work, receive payments.
- **Admin**: Verify missions/users and mediate disputes.

### Missions (Client Flow)
- Create a mission from **Missions → Create New Mission**.
- Provide title, description, skills, budget, timeline, and contact info.
- Missions require **admin verification** before going live.

### Missions (Builder Flow)
- Clients send offers from a builder’s profile.
- Review received offers on **Offers**.
- Accept to start a contract, or reject to decline.

### Mission Statuses
- `OPEN`: Waiting for a builder to accept an offer.
- `IN_PROGRESS`: A contract exists and work has started.
- `COMPLETED`: Work finished and accepted.
- `REFUNDED`: Payment returned to client.

### Contracts & Payments
- A contract is created when a builder accepts a client’s offer.
- Payments use **escrow** and can be released in milestones.
- Platform fee applies to transactions.

### Messaging & Notifications
- Users can message from mission pages or the Messages area.
- Messaging is used to coordinate work and resolve questions.

### Conflict Resolution

**How to report:** Go to a contract page and click "Report Conflict". Fill in the motive and submit.

**Who can create:** Client, Freelancer, or Admin.

**What happens when a conflict is created:**
- Conflict record is created with status `OPEN`.
- An admin is auto-assigned (round-robin).
- A group conversation is created (client + freelancer + admin) so parties can discuss.
- In-app notifications are sent to the client, freelancer, and assigned admin.
- The conflict appears on the `/conflicts` page.

**Who can resolve:**
- **Admin** (can always resolve).
- **Both parties together** (peer-to-peer with mutual agreement).

**Resolution types:**
- `FULL_REFUND`: All escrowed funds go back to the client. Contract inactive, mission cancelled.
- `FULL_RELEASE`: All escrowed funds go to the freelancer. Contract continues.
- `PARTIAL_REFUND`: Part refund to client, rest released to freelancer.
- `SPLIT`: Custom amounts for client refund and freelancer release.

**Escrow calculation:** Payments with status `MADE` = 100% in escrow; `RELEASED_1` = 75% in escrow; `RELEASED_2` = 25% in escrow.

**Payment processing:** Refunds and releases are automated. If the freelancer prefers crypto, the release is sent onchain (AVAX, WBTC.e, WETH.e). Otherwise it's processed offchain.

**Where to view conflicts:** `/conflicts` or the "My Conflicts" button on the Missions page.

### Troubleshooting
- If a mission is not visible, it may still be pending **admin verification**.
- If a mission shows the wrong status, it usually means the contract/payment state is out of sync.

### Chatbot Behavior
- Provide short, actionable answers.
- Ask a single clarifying question if the user’s request is vague.
