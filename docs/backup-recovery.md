# Database Backup & Recovery Guide

## 🔄 Backup Procedures

### 1. Automatic JSON Backup (Recommended for Development)

```bash
# Create a complete backup of all data
npx tsx scripts/backup-database.ts
```

**What it does:**
- Exports all tables to JSON format
- Includes relationships and metadata
- Stores in `backups/database-backup-[timestamp].json`
- Shows statistics of backed up data

### 2. PostgreSQL Native Backup (Recommended for Production)

```bash
# Create PostgreSQL dump
./scripts/backup-postgres.sh
```

**What it does:**
- Creates SQL dump using `pg_dump`
- Compresses backup with gzip
- Stores in `backups/postgres-backup-[timestamp].sql.gz`
- Automatically cleans up old backups (keeps last 10)

### 3. Before Schema Changes

**Always backup before:**
- Running `prisma migrate reset`
- Major schema changes
- Adding/removing tables
- Production deployments

```bash
# Backup before changes
npx tsx scripts/backup-database.ts

# Make your changes
npx prisma migrate dev

# Verify data integrity
npx tsx scripts/check-users.ts
```

## 👥 User Data Management

### Sync Missing Users from Clerk

If users exist in Clerk but not in your database:

```bash
# Sync all Clerk users to database
npx tsx scripts/sync-all-clerk-users.ts
```

**What it does:**
- Fetches all users from Clerk
- Creates missing users in database
- Assigns roles based on Clerk metadata
- Skips existing users
- Shows detailed sync report

### Fix Individual User

For specific user issues:

```bash
# Fix single user account
npx tsx scripts/fix-user-account-new.ts <clerkId> <email> <role> [firstName] [lastName] [companyName]

# Example:
npx tsx scripts/fix-user-account-new.ts user_123abc ali@example.com freelance "Ali" "Dindar"
```

### Check User Status

```bash
# List all users in database
npx tsx scripts/check-users.ts

# List all users in Clerk
npx tsx scripts/list-clerk-users.js

# Check specific user by email
npx tsx scripts/check-user-by-email.js user@example.com
```

## 🔧 Recovery Procedures

### 1. Restore from JSON Backup

```typescript
// scripts/restore-backup.ts (create this if needed)
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function restoreBackup(backupFile: string) {
  const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  
  // Restore users first (dependencies)
  for (const user of backup.data.users) {
    await prisma.user.upsert({
      where: { clerkId: user.clerkId },
      update: user,
      create: user
    });
  }
  
  // Then restore other tables...
}
```

### 2. Restore from PostgreSQL Backup

```bash
# Restore from SQL dump
gunzip -c backups/postgres-backup-[timestamp].sql.gz | psql -d database_name
```

### 3. Emergency Recovery Steps

1. **Check what's missing:**
   ```bash
   npx tsx scripts/check-users.ts
   npx tsx scripts/list-clerk-users.js
   ```

2. **Sync missing users:**
   ```bash
   npx tsx scripts/sync-all-clerk-users.ts
   ```

3. **Verify integrity:**
   ```bash
   # Check database state
   npx prisma studio
   
   # Test API endpoints
   curl http://localhost:3000/api/me
   ```

## 📋 Best Practices

### Daily Operations
- ✅ Backup before any major changes
- ✅ Test backups regularly
- ✅ Keep multiple backup versions
- ✅ Monitor user sync status

### Development Workflow
```bash
# 1. Backup current state
npx tsx scripts/backup-database.ts

# 2. Make schema changes
npx prisma migrate dev

# 3. Sync any missing users
npx tsx scripts/sync-all-clerk-users.ts

# 4. Verify everything works
npx tsx scripts/check-users.ts
```

### Production Deployment
```bash
# 1. Create production backup
./scripts/backup-postgres.sh

# 2. Deploy schema changes
npx prisma migrate deploy

# 3. Sync production users
npx tsx scripts/sync-all-clerk-users.ts

# 4. Verify deployment
# Test critical user flows
```

## 🚨 Troubleshooting

### "User not found" errors
**Cause:** User exists in Clerk but not in database
**Fix:** `npx tsx scripts/sync-all-clerk-users.ts`

### "Please complete your profile setup" 
**Cause:** Same as above
**Fix:** Same as above

### Duplicate email errors during sync
**Cause:** User exists with different clerkId
**Fix:** Manually investigate and clean up duplicates

### Missing roles after sync
**Cause:** Role doesn't exist in database
**Fix:** Run `npx prisma db seed` to create roles

## 📁 Backup Location

All backups are stored in:
```
backups/
├── database-backup-2025-08-06T21-09-56-965Z.json
├── database-backup-2025-08-06T21-11-22-803Z.json
└── postgres-backup-2025-08-06_21-15-30.sql.gz
```

**Note:** Backups are excluded from git (in `.gitignore`)

## 🔍 Technical Deep Dive

### How JSON Backup Works

The JSON backup system (`scripts/backup-database.ts`) uses Prisma to:

1. **Fetch all data** from every table with full relationships
2. **Create a structured object** with metadata and timestamp
3. **Write to JSON file** with human-readable formatting

```typescript
const backup = {
  timestamp: "2025-08-06T21:21:04.870Z",
  version: "1.0",
  data: {
    users: [...],       // All users with profiles, roles, missions, etc.
    missions: [...],    // All missions with contracts, payments, categories
    contracts: [...],   // All contracts with relationships
    // ... every table
  }
}
```

**Advantages:**
- ✅ **Complete data** with all relationships included
- ✅ **Human readable** - can inspect with any text editor
- ✅ **Cross-platform** - works on any system with Node.js
- ✅ **Development friendly** - great for debugging data issues
- ✅ **Detailed statistics** - shows exactly what was backed up

**Best for:** Development, testing, data analysis, debugging

### How PostgreSQL Backup Works

The PostgreSQL backup system (`scripts/backup-postgres.sh`) uses `pg_dump` to:

1. **Parse DATABASE_URL** to extract connection details
2. **Run pg_dump** with optimized flags for clean restore
3. **Compress with gzip** to save space
4. **Auto-cleanup** old backups (keeps last 10)

```bash
# Extract: postgresql://user:pass@host:port/dbname
pg_dump -h host -p port -U user -d dbname \
    --clean        # Include DROP statements for clean restore
    --no-acl       # Skip access control lists
    --no-owner     # Skip ownership information
    -f backup.sql  # Output to file

gzip backup.sql    # Compress for storage
```

**Advantages:**
- ✅ **Native format** - industry standard SQL dump
- ✅ **Optimized size** - compressed files save space
- ✅ **Fast restore** - direct psql command restore
- ✅ **Production ready** - used by major companies
- ✅ **Automatic cleanup** - prevents disk space issues

**Best for:** Production, scheduled backups, disaster recovery

### File Structure & Naming

```
backups/
├── database-backup-2025-08-06T21-09-56-965Z.json     # JSON: ISO timestamp
├── database-backup-2025-08-06T21-11-22-803Z.json     # JSON: Easy sorting
├── postgres-backup-2025-08-06_21-15-30.sql.gz        # SQL: Compressed
└── postgres-backup-2025-08-07_02-00-00.sql.gz        # SQL: Automated
```

**Naming Convention:**
- **JSON**: `database-backup-[ISO-timestamp].json`
- **PostgreSQL**: `postgres-backup-[date]_[time].sql.gz`
- **Automatic sorting** by date (newest first with `ls -t`)

### When to Use Which Method

| Situation | Use JSON | Use PostgreSQL | Reason |
|-----------|----------|----------------|---------|
| Before schema changes | ✅ | ❌ | Need to inspect data |
| Daily automated backups | ❌ | ✅ | Smaller files, faster |
| Debugging data issues | ✅ | ❌ | Human readable |
| Production deployment | ❌ | ✅ | Industry standard |
| Sharing with team | ✅ | ❌ | Easy to read/analyze |
| Long-term storage | ❌ | ✅ | Compressed, efficient |

### Restore Process

**JSON Restore** (manual):
```typescript
// Custom restore script needed
const backup = JSON.parse(fs.readFileSync('backup.json'));
// Manually recreate data with proper relationships
```

**PostgreSQL Restore** (automatic):
```bash
# Simple one-liner
gunzip -c backup.sql.gz | psql -d database_name
```

### Safety Features

1. **Never overwrites** - timestamped filenames prevent conflicts
2. **Git ignored** - sensitive data never committed to repo
3. **Error handling** - scripts fail safely with clear messages
4. **Verification** - statistics confirm what was backed up
5. **Cleanup automation** - prevents disk space exhaustion