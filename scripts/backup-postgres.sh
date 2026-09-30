#!/bin/bash

# PostgreSQL Database Backup Script
# Usage: ./scripts/backup-postgres.sh

# Load environment variables
source .env.local 2>/dev/null || source .env

# Extract database info from DATABASE_URL
# Example: postgresql://username:password@localhost:5432/database_name
if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASSWORD="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    echo "❌ Could not parse DATABASE_URL"
    exit 1
fi

# Create backup directory
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/postgres-backup-$TIMESTAMP.sql"

echo "🔄 Starting PostgreSQL backup..."
echo "📁 Database: $DB_NAME"
echo "💾 Backup file: $BACKUP_FILE"

# Set password for pg_dump
export PGPASSWORD="$DB_PASSWORD"

# Create backup
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --no-password \
    --verbose \
    --clean \
    --no-acl \
    --no-owner \
    -f "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL backup completed successfully!"
    echo "📁 Backup saved to: $BACKUP_FILE"
    
    # Compress the backup
    gzip "$BACKUP_FILE"
    echo "🗜️ Backup compressed to: $BACKUP_FILE.gz"
else
    echo "❌ PostgreSQL backup failed!"
    exit 1
fi

# Cleanup old backups (keep last 10)
echo "🧹 Cleaning up old backups..."
ls -t "$BACKUP_DIR"/postgres-backup-*.sql.gz | tail -n +11 | xargs -r rm
echo "✅ Cleanup completed!"