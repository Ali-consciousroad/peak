# Freelance Marketplace

Connecting talented freelancers with meaningful projects worldwide.

A modern freelance marketplace built with Next.js, Clerk authentication, and PostgreSQL database management.

## Product Overview

This marketplace connects **clients** and **builders** (freelancers) with a lightweight **admin** layer. The core flow is:

- **Clients** post missions and review applications.
- **Builders** apply to missions and deliver work.
- **Admins** verify content and can resolve conflicts.

## Key Flows (User‑Facing)

### Roles
- **Client**: Create missions, hire builders, manage contracts.
- **Builder**: Apply to missions, deliver work, receive payments.
- **Admin**: Verify missions/users, mediate disputes, manage platform health.
- Each user has **exactly one** platform role (`users.roleId` is required). Class diagram: **User 1 — Role**. Signup (`app/api/create-user-profile/route.ts`) always connects `client` or `freelance`.

### Missions
- Missions are created by clients and require **admin verification** before going live.
- Statuses: `OPEN`, `IN_PROGRESS`, `COMPLETED`, `REFUNDED`.
- When a contract exists, missions should never remain `OPEN`.

### Contracts & Payments
- A contract is created when a client accepts a builder’s application.
- Payments can be escrowed and released in milestones.
- Platform fee is taken on transactions; refunds/releases are handled by the system.

### Conflict Resolution
- Either party (or admin) can report a conflict from a contract page (`/contracts/[id]`).
- **On conflict creation:** Admin is auto-assigned, a group conversation (client + freelancer + admin) is created, and in-app notifications are sent to all involved parties. These three writes run in **one `prisma.$transaction`** in `POST` `app/api/conflicts/route.ts` so a conflict cannot be saved without at least one inbox row (diagram: Conflict **0..1 — 1..* Notification**).
- **Who resolves:** Admin can always resolve; both parties can resolve together via mutual agreement (peer-to-peer).
- **Resolution types:** `FULL_REFUND`, `FULL_RELEASE`, `PARTIAL_REFUND`, `SPLIT`. Refunds and releases are processed automatically; crypto payouts go onchain if the freelancer prefers crypto.
- **View conflicts:** `/conflicts` or the "My Conflicts" button on the Missions page.
- See `docs/README.md` for the full conflict workflow.

### Messages vs Notifications vs admin verification badge

These three look similar in the UI but they are **not** the same class. Easy to mix up at the defence.

**Message** (`messages` table) — a line **inside a chat**.
- Written by a **user** (sender) in a **Conversation**.
- Screen: `/messages`, conflict chat (`components/ConflictMessaging.tsx`).
- API: `app/api/conversations/[id]/messages/route.ts`.
- Example: “I’ll send the mockups tomorrow.”
- Class diagram: Conversation contains Messages; User sends Messages.

**Notification** (`notifications` table) — a **system alert** in the **inbox**, not a chat.
- Written by the **application** when something happens (not by typing in a thread).
- Screen: inbox widget `components/InAppNotifications.tsx` (`GET /api/notifications`).
- Columns: `type`, `title`, `message` (alert text — **not** a Message object), optional `missionId` / `conflictId`, `readAt`.
- Created today only for: conflict reported/resolved, payment/milestone released, payout required, payout completed.
  - Example: `app/api/conflicts/route.ts` → `type: conflict_created`, title `Conflict reported: …` (one row per recipient: client, freelancer, admin).
- **Posting a mission does not create a Notification row.**
- Class diagram: User receives Notifications. Conflict **0..1 — 1..* Notification** (reporting a conflict always inserts at least one inbox row; payment alerts have no conflict). Mission **0..1 — 0..* Notification** (a mission may appear on a later payment/conflict alert; creating a mission creates **zero** inbox rows).
- **Code that enforces Conflict → 1..* Notification:** `prisma.$transaction` in `POST` `app/api/conflicts/route.ts` (conflict + conversation + `notifications.createMany` with `type: conflict_created`). If notifications fail, the whole report is rolled back. Search the file for `$transaction`.

**Admin verification badge** — **not** a Notification.
- File `components/MissionVerificationNotification.tsx` is named “notification” but it is only a **dashboard count** of missions with `isVerified = false` (`lib/hooks/useUnverifiedMissions.ts`).
- No row in `notifications`. It disappears when an admin verifies the mission (`app/api/missions/[id]/verify/route.ts`).
- For the jury: call this a **badge / widget**, not the Notification class.

**One sentence for the defence:** *Message = discussion. Notification = alerte persistée (boîte de réception). Le compteur « missions à vérifier » est de l’UI sur Mission.isVerified, pas une Notification.*

**Architecture closer (say this if they ask how the app works):**

- **FR:** *L’architecture est en trois couches : les pages Next.js appellent des routes `/api`, qui passent par Prisma vers PostgreSQL. L’identité vient de Clerk, le rôle métier est une ligne dans `roles` (un rôle par utilisateur). Les discussions sont des Message dans une Conversation ; les alertes sont des Notification. Le badge « missions à vérifier » est de l’UI sur Mission.isVerified, pas une Notification.*
- **EN:** *The architecture has three layers: Next.js pages call `/api` routes, which use Prisma to talk to PostgreSQL. Identity comes from Clerk; the platform role is one row in `roles` (exactly one role per user). Chats are Message objects inside a Conversation; alerts are Notification objects. The “missions to verify” badge is UI on Mission.isVerified, not a Notification.*

## Chatbot (FAQ + LLM)

**Knowledge base file (edit this when product behavior changes):** [`docs/chatbot-knowledge.md`](./docs/chatbot-knowledge.md)

The chatbot supports **two layers** (the assistant works **without signing in**; `/api/chatbot` is a public route):

1. **Rules/FAQ**: keyword‑matched responses (fast, reliable).
2. **LLM (optional)**: OpenAI‑compatible endpoint (Ollama locally or hosted).

### LLM context source
When LLM mode is enabled (Ollama or OpenAI-compatible API), the API injects a **truncated version** of [`docs/chatbot-knowledge.md`](./docs/chatbot-knowledge.md) as context so answers stay aligned with the platform. If that file is missing, it falls back to [`docs/README.md`](./docs/README.md). Keep the knowledge file updated when conflict rules, mission lifecycle, payments, or roles change.

### Free Local LLM (Ollama)
1. Install Ollama: https://ollama.com/download
2. **Ollama server** (must be running before you use the chatbot in `llm` / `hybrid` mode). After install, the **desktop app often starts automatically** and keeps the API on `http://localhost:11434` — you only need to “start” it if nothing is listening there.
   - **macOS / Windows:** open the **Ollama** app if it is not already running (menu bar / system tray icon usually means it is up).
   - **Linux or headless:** from a terminal:
     ```bash
     ollama serve
     ```
     Leave that process running (or run it under your process manager).
   - **Stop Ollama** (when you need a clean restart or to free the port):
     - **macOS:** menu bar **Ollama** icon → **Quit**, or in Terminal: `killall ollama`
     - **Windows:** right‑click the Ollama icon in the system tray → **Quit**, or Task Manager → end **Ollama** processes
     - **Linux / terminal `ollama serve`:** press **Ctrl+C** in that terminal, or: `killall ollama`
     Then start again (open the app or run `ollama serve`).
   - **Port `11434` already in use** (`bind: address already in use`): something is still listening—often the **menu bar app** restarted `ollama` after `killall`. **Quit Ollama from the menu bar first**, then see what holds the port and stop it:
     ```bash
     lsof -nP -iTCP:11434 -sTCP:LISTEN
     ```
     Note the **PID** in the second column, then:
     ```bash
     kill <PID>
     ```
     If it does not exit, use `kill -9 <PID>`. On macOS you can also try `killall Ollama` (app) and `killall ollama` (CLI). Only run **`ollama serve`** when nothing is already listening—if the desktop app is running, you usually **do not** start a second server.
3. Pull a model:
   ```bash
   ollama pull llama3.1:8b
   ```
4. Set env vars:
```
CHATBOT_MODE=hybrid
CHATBOT_OPENAI_BASE_URL=http://localhost:11434
CHATBOT_OPENAI_MODEL=llama3.1:8b
```

### Modes
- `rules`: FAQ only (no HTTP call to Ollama; fine if the LLM is off).
- `llm`: LLM only (returns an error if the LLM request fails).
- `hybrid`: try the LLM first; if the LLM is **unreachable** (wrong URL, Ollama stopped, bad model name, etc.) or returns an error, the API **falls back to FAQ/rules** so the widget still responds.

Set **`CHATBOT_MODE`** in your environment (e.g. `.env.local` or your host’s dashboard) and restart the app when you change it.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (Prisma-hosted)
- Clerk account for authentication

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd freelanceMarketplace
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgres://..."
   
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   CLERK_WEBHOOK_SECRET=whsec_...
   
   # Web3 Wallet Connection (Required)
   # Get project ID from: https://cloud.walletconnect.com
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
   
   # Platform Wallet for Crypto Payments (Optional - for crypto payments)
   # Format: 0x followed by 64 hex characters
   PLATFORM_WALLET_PRIVATE_KEY=0x...
   
   # Avalanche RPC URL (Optional - defaults to public RPC)
   AVALANCHE_RPC_URL=https://api.avax.network/ext/bc/C/rpc
   
   # CoinGecko API Key (Optional - for higher rate limits)
   COINGECKO_API_KEY=your_api_key_here

   # Chatbot (Optional - free local LLM via Ollama)
   # Modes: rules | llm | hybrid
   CHATBOT_MODE=hybrid
   CHATBOT_OPENAI_BASE_URL=http://localhost:11434
   CHATBOT_OPENAI_MODEL=llama3.1:8b
   # CHATBOT_OPENAI_API_KEY=your_key_here
  ```
   
   **📖 For complete Web3 setup instructions, see [docs/web3-complete-setup.md](./docs/web3-complete-setup.md)**

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Management

### **Starting PostgreSQL Locally**

If you want to use a local PostgreSQL database instead of the Prisma-hosted one:

#### **macOS (using Homebrew)**
```bash
# Install PostgreSQL (latest stable version)
brew install postgresql

# Or install specific version to match production (PostgreSQL 14)
# brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql

# Or start manually
pg_ctl -D /opt/homebrew/var/postgres start

# Create database
createdb freelance_marketplace

# Update your .env.local with local database URL
DATABASE_URL="postgresql://username:password@localhost:5432/freelance_marketplace"
```

#### **Ubuntu/Debian**
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Switch to postgres user and create database
sudo -u postgres psql
CREATE DATABASE freelance_marketplace;
CREATE USER your_username WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE freelance_marketplace TO your_username;
\q

# Update your .env.local
DATABASE_URL="postgresql://your_username:your_password@localhost:5432/freelance_marketplace"
```

#### **Windows**
```bash
# Download and install PostgreSQL from https://www.postgresql.org/download/windows/
# Or use Chocolatey
choco install postgresql

# Start PostgreSQL service (usually starts automatically)
# Create database using pgAdmin or command line
createdb -U postgres freelance_marketplace

# Update your .env.local
DATABASE_URL="postgresql://postgres:password@localhost:5432/freelance_marketplace"
```


### **Checking PostgreSQL Status**

To verify if PostgreSQL is running:

```bash
# Quick check - returns "accepting connections" if running
pg_isready -h localhost -p 5432

# Check service status (macOS with Homebrew)
brew services list | grep postgresql

# Check if PostgreSQL process is running
ps aux | grep postgres

# Test database connection
psql -h localhost -p 5432 -U your_username -d freelance_marketplace -c "SELECT version();"
```

**Common Status Messages:**
- ✅ `localhost:5432 - accepting connections` → PostgreSQL is running
- ❌ `no response` or connection error → PostgreSQL is not running

**If PostgreSQL is not running:**
```bash
# macOS (Homebrew)
brew services start postgresql@14
# OR
brew services restart postgresql@14

# Linux (systemd)
sudo systemctl start postgresql
sudo systemctl status postgresql

# Windows
# Usually starts automatically, check Services panel
```

### **Direct PostgreSQL Access (psql CLI)**
Connect directly to your PostgreSQL database:

```bash
# Connect to local database
psql "postgresql://username@localhost:5432/freelance_marketplace"

# Connect to your Prisma PostgreSQL database (if using Prisma-hosted)
psql "postgres://2cf317536d16601faa61abf7c34c58ac0208aaf27875b0958c372151fe8001a7:sk_eU35sZwcV-V73MPy-jyAK@db.prisma.io:5432/postgres?sslmode=require"
```

### **Troubleshooting**

#### **Contract Fetching Issues**

If you're getting "Wallet verification required" or "Failed to fetch contracts" errors:

**Problem:** The `/api/contracts` route was requiring SIWE (Sign-In With Ethereum) wallet verification for all requests, including GET requests to view contracts.

**Solution:** GET requests to view contracts no longer require wallet verification. Only mutations (POST, PUT, DELETE) require wallet verification for security.

**How it was fixed:**
- Updated `lib/security/siwe.ts` to check HTTP method
- GET requests to `/api/contracts` bypass wallet verification
- POST/PUT/DELETE requests still require wallet verification

**If you still see errors:**
1. Check if PostgreSQL is running: `pg_isready -h localhost -p 5432`
2. Verify your authentication: Check browser console for Clerk auth status
3. Check browser Network tab for the actual API response
4. Verify you have contracts: Check database with `SELECT COUNT(*) FROM contracts;`

#### **Clerk ID Sync Issues**

If users can't see their profile in the navbar or dashboard doesn't load properly, the user might be missing their Clerk ID in the database.

#### **Step 1: Check if user has Clerk ID**
```sql
-- Check user's Clerk ID status
SELECT id, email, "clerkId", role, "firstName", "lastName" 
FROM users 
WHERE email = 'user@example.com';
```

#### **Step 2: Get Clerk User ID**

**Option A: From Browser Console (When Logged In)**
When logged in as the user, open browser console (F12) and run:
```javascript
console.log('Clerk User ID:', window.Clerk?.user?.id);
```

**Option B: From Clerk Dashboard**
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. **Sign in** with your Clerk account
3. **Select your project** (Freelance Marketplace)
4. **Navigate to "Users"** in the left sidebar
5. **Search for the user** by email address
6. **Click on the user** to view their profile
7. **Copy the User ID** (starts with `user_`)

**Option C: From Network Tab**
1. **Log in** as the user in your app
2. **Open DevTools** (F12) → **Network tab**
3. **Look for requests** to `/api/me` or Clerk endpoints
4. **Check the response** - it will contain the user ID

#### **Step 3: Update User with Clerk ID**
```sql
-- Update user with their Clerk ID (replace with actual ID from step 2)
UPDATE users 
SET "clerkId" = 'user_2abc123def456ghi789' 
WHERE email = 'user@example.com';
```

#### **Step 4: Verify the Fix**
```sql
-- Verify the update worked
SELECT id, email, "clerkId", role, "firstName", "lastName" 
FROM users 
WHERE email = 'user@example.com';
```

#### **Common Issues:**
- **Empty clerkId**: User exists in database but not linked to Clerk
- **404 errors**: `/api/me` can't find user because clerkId lookup fails
- **Missing navbar data**: User role/profile not loading properly

#### **Quick Fix Script:**
Use the provided sync script: `scripts/sync-clerk-id.ts`

### **Prevention: How to Avoid This Issue**

#### **Why This Issue Happens:**
- **Manual database insertion** without proper Clerk ID linking
- **Database seeding** that creates users without Clerk accounts
- **Import from other systems** that don't include Clerk IDs
- **Direct SQL inserts** that skip the proper user creation flow

#### **How to Prevent It:**

**✅ CORRECT User Creation Flow:**
1. **User signs up** through Clerk (not manual database insertion)
2. **Clerk webhook** triggers user creation in your database
3. **`/api/create-user-profile`** creates user with proper `clerkId`
4. **User completes onboarding** with role selection

**❌ AVOID These Practices:**
```sql
-- DON'T do this - creates users without Clerk IDs
INSERT INTO users (email, role, firstName, lastName) 
VALUES ('user@example.com', 'freelance', 'John', 'Doe');
```

**✅ DO This Instead:**
- Let users sign up through your app's registration flow
- Use the existing `/api/create-user-profile` endpoint
- Ensure all users go through the onboarding process

#### **Database Seeding Best Practices:**
If you need to seed test users:
1. **Create Clerk accounts first** (manually or programmatically)
2. **Get the Clerk IDs** from the accounts
3. **Insert users with proper `clerkId`** values
4. **Or use the webhook system** to create users automatically

#### **Monitoring:**
Add a database check to find users with missing Clerk IDs:
```sql
-- Find users without Clerk IDs (potential issues)
SELECT id, email, role, "firstName", "lastName" 
FROM users 
WHERE "clerkId" IS NULL OR "clerkId" = '';
```

**Common psql Commands:**
```sql
-- List all tables
\dt

-- Show table structure
\d users
\d missions
\d categories

-- View data
SELECT * FROM users LIMIT 5;
SELECT * FROM missions LIMIT 5;
SELECT * FROM categories;

-- Count records
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM missions;

-- Show relationships
SELECT u.email, m.title 
FROM users u 
JOIN missions m ON u.id = m.clientId 
LIMIT 5;

-- Show categories and their missions
SELECT c.name, COUNT(m.id) as mission_count
FROM categories c
LEFT JOIN _CategoryToMission cm ON c.categoryId = cm.A
LEFT JOIN missions m ON cm.B = m.id
GROUP BY c.name;

-- Show user roles distribution
SELECT role, COUNT(*) as count
FROM users 
GROUP BY role;
```

### **Prisma Studio (GUI)**
Access your database through Prisma Studio:

```bash
npx prisma studio
```

Opens a browser UI (default http://localhost:5555) to browse and edit tables.

**Refresh after schema or migration changes** — Prisma Studio does not hot-reload the table list. If you still see dropped tables (e.g. `saved_missions`, `smart_contracts`) or miss new ones:

1. Stop Studio: `Ctrl+C` in the terminal where it runs (or quit the process).
2. Apply migrations if needed: `npx prisma migrate deploy` (or `npx prisma migrate dev` in development).
3. Regenerate the client: `npx prisma generate`
4. Start Studio again: `npx prisma studio`
5. Hard-refresh the browser tab (`Cmd+Shift+R` / `Ctrl+Shift+R`) or open the URL in a new tab.

Check sync: `npx prisma migrate status` should report **Database schema is up to date!**

## 🏗️ Database Schema & Structure

### **Schema Definition**
Your database schema is defined in **`prisma/schema.prisma`**. That file is the **source of truth** for:

- PostgreSQL tables and columns (via `prisma/migrations/`)
- The generated Prisma Client (`npx prisma generate`)
- What you should reflect in the class diagram and data dictionary (TFE)

**Current core models (V1):** `users`, `roles`, `missions`, `offers`, `contracts`, `payments`, `currencies`, `conflicts`, `reviews`, `portfolios`, `projects`, `skills`, `categories`, `conversations`, `conversation_participants`, `messages`, `notifications`.

**Removed from V1 (no longer in schema or DB after migrations):** `saved_missions`, `smart_contracts`, `chatbots`. Escrow and crypto use **`payments`** and business APIs, not a `smart_contracts` table.

Open `prisma/schema.prisma` for the full model list, fields, and relations.

### **Database Seeding**
Your initial data is populated via **`prisma/seed.ts`**:

```typescript
// Creates default categories, users, and sample data
async function main() {
  // Create default categories
  const webDev = await prisma.category.create({
    data: { name: "Web Development", description: "Frontend and backend development" }
  });
  
  // Create sample missions
  await prisma.mission.create({
    data: {
      title: "Build a React Website",
      categories: { connect: [{ id: webDev.id }] }
    }
  });
}
```

**Purpose:** This file populates your database with initial data for development, testing, and demonstration purposes.

### **Database Migrations**
Located in **`prisma/migrations/`**:

```bash
# Apply pending migrations (local or shared DB)
npx prisma migrate deploy

# Development: create/apply migrations from schema changes
npx prisma migrate dev

# Reset database and re-seed (destructive — deletes all data)
npx prisma migrate reset

# Regenerate Prisma Client after schema changes
npx prisma generate

# New migration after editing schema.prisma
npx prisma migrate dev --name describe_your_change
```

**Purpose:** Migrations track and apply database schema changes over time, ensuring your database structure evolves with your application.

### **Key Database Features**
- **PostgreSQL** - Robust, production-ready database
- **Prisma ORM** - Type-safe database client with auto-completion
- **Relationships** - Proper foreign keys and joins between tables
- **Migrations** - Version-controlled database schema changes
- **Seeding** - Automated data population for development

## 👥 User Roles & Features

### Client
- Post projects and missions
- Hire freelancers
- Manage contracts and payments
- Access to `/missions` and client dashboard

### Freelancer  
- Browse available missions
- Offer services and skills
- Manage portfolio, services, and skills
- Access to `/services`, `/portfolios`, `/skills` and freelance dashboard

### Admin
- Full system access
- User management
- Mission and contract oversight
- Access to `/admin` dashboard

### Support
- Limited administrative access
- Mission and contract management
- Access to `/support` dashboard

## 💰 Payment System

### Payment Status Flow
The platform uses an escrow-based payment system with the following statuses:

#### Payment Status Labels
- **"Payment: Pending"** - Payment made, waiting for admin verification
- **"Payment: None"** - No payment has been made yet
- **"Payment: Made"** - Admin verified, held in escrow
- **"Payment: Released #1"** - Milestone 1 released (25%)
- **"Payment: Released #2"** - Milestone 2 released (50%)
- **"Payment: Completed"** - All milestones completed (100%)
- **"Payment: Cancelled"** - Payment cancelled
- **"Payment: Error"** - Technical error occurred

#### Mission Status Flow
- **OPEN** - Mission available for builders to apply
- **IN_PROGRESS** - Builder hired, work in progress
- **OVERDUE** - Deadline passed, grace period active (25% extra time)
- **COMPLETED** - Mission successfully finished
- **REFUNDED** - Refund processed after admin review (manual process, no auto-refunds)

#### Payment Workflow
1. **Client makes payment** → Status: `PENDING`
2. **Admin verifies payment** → Status: `MADE` (held in escrow)
3. **Client releases milestone 1** → Status: `RELEASED_1` (25%)
4. **Client releases milestone 2** → Status: `RELEASED_2` (50%)
5. **Client releases milestone 3** → Status: `COMPLETED` (25% - final)

#### Milestone Structure
- **Milestone 1 (25%)**: Project kickoff and initial deliverables
- **Milestone 2 (50%)**: Mid-project progress and core functionality  
- **Milestone 3 (25%)**: Final delivery and project completion

#### Escrow Account
- **Bank**: KBC Bank NV
- **Account**: BE68 5390 0754 7034
- **Purpose**: Secure payment holding until milestone completion

## ⛓️ Onchain Transactions (Avalanche C-Chain)

The platform can execute real blockchain transactions on **Avalanche C-Chain** when builders prefer crypto payments (AVAX, WBTC.e, WETH.e) and `PLATFORM_WALLET_PRIVATE_KEY` is configured.

### What Triggers Onchain Transactions

| Trigger | What Happens |
|---------|--------------|
| **Client releases payment** (full or milestone) | Platform wallet sends crypto to builder's wallet |
| **Mission marked complete** | Remaining escrow sent to builder's wallet |
| **Conflict resolved** (with release to freelancer) | Release amount sent to freelancer's wallet |

### Conflict Resolution & Onchain Activity

When a conflict is resolved in favor of the freelancer, the system can trigger an onchain transaction:

- **FULL_RELEASE** — All escrowed crypto is sent to the freelancer's wallet in a single transaction.
- **PARTIAL_REFUND** / **SPLIT** — The release portion is sent onchain to the freelancer; the refund portion is processed offchain (e.g. bank transfer to the client).

The conflict resolution flow (`app/api/conflicts/[id]/resolve/route.ts`) calculates escrow, applies the chosen resolution type, and—when the freelancer's preferred payment is crypto—calls `lib/crypto-transactions.ts` to send the release amount from the platform wallet. Transaction hashes are stored in the database and viewable on [Snowtrace](https://snowtrace.io/).

**Note:** Wallet connection and SIWE (Sign-In With Ethereum) only sign messages; they do not send onchain transactions.

📖 For setup and full details, see [docs/crypto-payments-setup.md](./docs/crypto-payments-setup.md).

## 🏗️ Architecture Overview

### Database Schema
The application uses a flattened user model with the following core entities:

#### Core Models:
- **User**: Main user accounts with role-based access
- **Mission**: Project postings with client relationships
- **Category**: Mission categories (new feature)
- **Contract**: Agreements between clients and freelancers  
- **Payment**: Transaction records
- **Service**: Freelancer service offerings
- **Skill**: Freelancer skills
- **Portfolio**: Freelancer work examples
- **Review**: User feedback system
- **Offer**: Freelancer proposals for missions
- **Conflict**: Dispute resolution system

### Key Relationships:
- **Mission ↔ Category** (Many-to-Many)
- **User ↔ Mission** (One-to-Many)
- **User ↔ Service** (One-to-Many)
- **User ↔ Skill** (One-to-Many)
- **User ↔ Portfolio** (One-to-Many)
- **Mission ↔ Contract** (One-to-One)
- **Contract ↔ Payment** (One-to-Many)
- **Mission ↔ Offer** (One-to-Many)
- **User ↔ Review** (One-to-Many)

## 🛠️ Tech Stack

### Core Framework & Runtime
- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript
- **Runtime:** Node.js 18+

### Authentication & Security
- **Authentication:** Clerk (OAuth, email/password, social login)
- **Authorization:** Role-based access control (RBAC)

### Database & ORM
- **Database:** PostgreSQL (Prisma-hosted)
- **ORM:** Prisma (type-safe database client)

### Frontend & UI
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI
- **Icons:** Lucide React
- **Forms:** React Hook Form

### Key Libraries
- **@clerk/nextjs** - Authentication
- **@prisma/client** - Database ORM
- **react-hook-form** - Form handling
- **wagmi** - React hooks for Ethereum
- **@rainbow-me/rainbowkit** - Wallet connection UI

## 📁 Project Structure

```
├── app/
│   ├── api/                 # API routes
│   ├── admin/              # Admin dashboard
│   ├── missions/           # Mission listings
│   ├── services/           # Freelance services
│   ├── portfolios/         # Freelance portfolios
│   ├── skills/             # Freelance skills
│   ├── contracts/          # Contract management
│   ├── reviews/            # User reviews
│   ├── applications/       # Job applications
│   ├── client-applications/ # Client-side applications
│   ├── my-missions/        # User's own missions
│   ├── dashboard/          # User dashboard
│   ├── profile/            # User profile
│   ├── messages/           # Messaging system
│   ├── help/               # Help/FAQ pages
│   ├── onboarding/         # User onboarding
│   ├── role-selection/     # Role selection
│   ├── account-status/     # Account status
│   ├── sign-in/            # Authentication pages
│   ├── sign-up/            # Registration pages
│   ├── sync/               # Data synchronization
│   ├── debug/              # Debug pages
│   ├── test/               # Testing pages
│   ├── components/         # UI components
│   ├── fonts/              # Custom fonts
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   ├── globals.css         # Global styles
│   ├── middleware.ts       # Authentication middleware
│   └── sitemap.ts          # SEO sitemap
├── components/             # Shared UI components
├── lib/                    # Utilities and configurations
├── prisma/                 # Database schema and migrations
└── scripts/                # Utility scripts
```

## 🧪 Testing

### Conflict Resolution Tests (20/80)

Quick automated checks for conflict resolution. Run these before manual testing or after changes to conflict-related code.

| Command | What it does |
|---------|--------------|
| `bash scripts/smoke-test-code-only.sh` | **Smoke test** — Verifies file structure, Prisma usage, escrow logic, auto-conversation, notifications. No server required. |
| `npm run test:conflicts` | **Unit tests** — Vitest tests for escrow calculation (MADE, RELEASED_1, RELEASED_2) and resolution types (FULL_REFUND, FULL_RELEASE, etc.). |

**Run both:**
```bash
bash scripts/smoke-test-code-only.sh && npm run test:conflicts
```

**What they validate:**
- Required API routes and components exist
- Escrow formula: MADE=100%, RELEASED_1=75%, RELEASED_2=25%, COMPLETED=0%
- Conflict creation creates conversation and notifications
- Notifications API and InAppNotifications component
- Resolution types in ConflictResolution UI

For full manual scenarios, see `scripts/test-conflict-resolution.md`.

---

### Test Users
- **Freelancer:** `ali_dindar@live.be` (working)
- **Admin:** `admin@example.com` (database only)
- **Client:** `company.inc@example.com` (database only)
- **Support:** `support@example.com` (database only)

### Useful Commands
```bash
# Database operations
npx prisma studio          # Open database GUI (restart after migrations to refresh table list)
npx prisma migrate status  # Check if DB matches migrations
npx prisma migrate deploy  # Apply migrations without reset
npx prisma generate        # Generate Prisma client
npx prisma db seed         # Seed database with initial data

# Development
npm run dev               # Start development server
npm run build             # Build for production

# Tests
npm run test              # Run all vitest tests
npm run test:conflicts    # Run conflict resolution tests only
bash scripts/smoke-test-code-only.sh   # Conflict resolution smoke test
```

## 📝 API Endpoints

### Public Endpoints
- `GET /api/missions` - List all missions
- `GET /api/services` - List all services
- `GET /api/skills` - List all skills
- `GET /api/portfolios` - List all portfolios
- `GET /api/categories` - List all categories

### Protected Endpoints
- `GET /api/me` - Get current user data
- `POST /api/missions` - Create new mission (client role only)
- `POST /api/services` - Create new service (freelancer role only)
- `POST /api/skills` - Create new skill (freelancer role only)
- `POST /api/portfolios` - Create new portfolio (freelancer role only)

### Admin Endpoints
- `GET /api/admin/stats` - Get admin statistics
- `GET /api/admin/users` - List all users (admin only)
- `PUT /api/admin/users/[id]` - Update user role (admin only)