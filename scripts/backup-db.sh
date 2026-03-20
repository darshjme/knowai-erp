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
RETENTION_DAILY=7
RETENTION_WEEKLY=4
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

# Weekly backup (every Sunday)
DAY_OF_WEEK=$(date +%u)
if [ "${DAY_OF_WEEK}" -eq 7 ]; then
    mkdir -p "${BACKUP_DIR}/weekly"
    cp "${BACKUP_FILE}" "${BACKUP_DIR}/weekly/knowai_erp_weekly_$(date +%Y-%m-%d).sql.gz"
    log "Weekly backup created."
    # Cleanup old weekly backups
    ls -1t "${BACKUP_DIR}/weekly"/knowai_erp_weekly_*.sql.gz 2>/dev/null | tail -n +$((RETENTION_WEEKLY + 1)) | xargs rm -f 2>/dev/null || true
fi

# Cleanup old daily backups
ls -1t "${BACKUP_DIR}"/knowai_erp_*.sql.gz 2>/dev/null | tail -n +$((RETENTION_DAILY + 1)) | xargs rm -f 2>/dev/null || true
log "Retention: $(ls -1 "${BACKUP_DIR}"/knowai_erp_*.sql.gz 2>/dev/null | wc -l | tr -d ' ') daily, $(ls -1 "${BACKUP_DIR}/weekly"/knowai_erp_weekly_*.sql.gz 2>/dev/null | wc -l | tr -d ' ') weekly"

log "Backup process finished."
