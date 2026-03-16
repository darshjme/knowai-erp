#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Know AI ERP - Database Backup Script
# Usage: ./scripts/backup-db.sh
# Backs up knowai_erp database to /backups/ with timestamp
# Retains last 30 backups, deletes older ones
# ─────────────────────────────────────────────────────────────

set -euo pipefail

# Configuration
DB_NAME="${DB_NAME:-knowai_erp}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_COUNT=30
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/knowai_erp_${TIMESTAMP}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

log() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "${message}"
    echo "${message}" >> "${LOG_FILE}"
}

log "Starting backup of database '${DB_NAME}'..."

# Perform backup
if PGPASSWORD="${PGPASSWORD:-postgres}" pg_dump \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --no-owner \
    --no-acl \
    --format=plain \
    | gzip > "${BACKUP_FILE}"; then

    FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    log "Backup completed successfully: ${BACKUP_FILE} (${FILESIZE})"
else
    log "ERROR: Backup failed!"
    rm -f "${BACKUP_FILE}"
    exit 1
fi

# Cleanup old backups - keep only the last N
BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}"/knowai_erp_*.sql.gz 2>/dev/null | wc -l | tr -d ' ')
if [ "${BACKUP_COUNT}" -gt "${RETENTION_COUNT}" ]; then
    DELETE_COUNT=$((BACKUP_COUNT - RETENTION_COUNT))
    log "Removing ${DELETE_COUNT} old backup(s) (keeping last ${RETENTION_COUNT})..."
    ls -1t "${BACKUP_DIR}"/knowai_erp_*.sql.gz | tail -n "${DELETE_COUNT}" | xargs rm -f
    log "Old backups removed."
else
    log "Total backups: ${BACKUP_COUNT}/${RETENTION_COUNT} (no cleanup needed)"
fi

log "Backup process finished."
