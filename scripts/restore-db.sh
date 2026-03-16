#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Know AI ERP - Database Restore Script
# Usage: ./scripts/restore-db.sh <backup_file>
# Example: ./scripts/restore-db.sh /backups/knowai_erp_20260317_120000.sql.gz
# ─────────────────────────────────────────────────────────────

set -euo pipefail

# Configuration
DB_NAME="${DB_NAME:-knowai_erp}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Validate argument
if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_file>"
    echo ""
    echo "Available backups:"
    ls -lht /backups/knowai_erp_*.sql.gz 2>/dev/null || echo "  No backups found in /backups/"
    exit 1
fi

BACKUP_FILE="$1"

# Validate file exists
if [ ! -f "${BACKUP_FILE}" ]; then
    echo "ERROR: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "┌─────────────────────────────────────────────────┐"
echo "│         Know AI ERP - Database Restore          │"
echo "├─────────────────────────────────────────────────┤"
echo "│ File:     ${BACKUP_FILE}"
echo "│ Size:     ${FILESIZE}"
echo "│ Database: ${DB_NAME}"
echo "│ Host:     ${DB_HOST}:${DB_PORT}"
echo "└─────────────────────────────────────────────────┘"
echo ""
echo "WARNING: This will DROP and RECREATE the '${DB_NAME}' database."
echo "All existing data will be permanently lost."
echo ""
read -rp "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting restore..."

# Drop and recreate database
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Dropping existing database..."
PGPASSWORD="${PGPASSWORD:-postgres}" psql \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d postgres \
    -c "DROP DATABASE IF EXISTS ${DB_NAME};"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Creating fresh database..."
PGPASSWORD="${PGPASSWORD:-postgres}" psql \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d postgres \
    -c "CREATE DATABASE ${DB_NAME};"

# Restore from backup
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restoring from backup..."
if gunzip -c "${BACKUP_FILE}" | PGPASSWORD="${PGPASSWORD:-postgres}" psql \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --quiet; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restore completed successfully!"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Restore failed!"
    exit 1
fi

echo ""
echo "Done. You may need to run 'npx prisma migrate deploy' to apply any pending migrations."
