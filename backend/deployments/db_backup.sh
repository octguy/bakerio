#!/bin/bash

# ==============================================================================
# Bakerio Database Offsite Backup Script
# ==============================================================================
# This script performs a backup of the Postgres database running inside Docker,
# compresses it, and secure-copies (SCP) it to a backup VPS (Singapore or Vietnam).
# It also performs retention cleanup both locally and on the remote backup VPS.
#
# Recommended execution: Daily via Cron job.
# ==============================================================================

# Exit immediately if a command exits with a non-zero status
set -e

# Setup directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/backups"
mkdir -p "${BACKUP_DIR}"

# Load production env variables if .env.prod exists
if [ -f "${SCRIPT_DIR}/.env.prod" ]; then
    export $(grep -v '^#' "${SCRIPT_DIR}/.env.prod" | xargs)
fi

# Configuration Variables (fallbacks if not defined in environment)
DB_CONTAINER="${DB_CONTAINER:-bakerio-postgres}"
DB_USER="${DB_USER:-bakerio}"
DB_NAME="${DB_NAME:-bakeriodb}"

# Offsite Backup Server Settings (Defaulting to placeholder VPS configuration)
BACKUP_VPS_HOST="${BACKUP_VPS_HOST:-sg-backup.bakerio.thinhuit.id.vn}"
BACKUP_VPS_USER="${BACKUP_VPS_USER:-root}"
BACKUP_VPS_PORT="${BACKUP_VPS_PORT:-22}"
BACKUP_VPS_PATH="${BACKUP_VPS_PATH:-/var/backups/bakerio}"
BACKUP_SSH_KEY="${BACKUP_SSH_KEY:-~/.ssh/id_rsa}"

# Resolve BACKUP_SSH_KEY path (handle ~ expansion manually)
if [[ "${BACKUP_SSH_KEY}" == \~/* ]]; then
    BACKUP_SSH_KEY="${HOME}/${BACKUP_SSH_KEY#\~/}"
fi

# Retention Policy
LOCAL_RETENTION_DAYS=7
REMOTE_RETENTION_DAYS=30

# File name formats
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="${DB_NAME}_backup_${TIMESTAMP}.sql"
BACKUP_FILEPATH="${BACKUP_DIR}/${BACKUP_FILENAME}"
GZIP_FILEPATH="${BACKUP_FILEPATH}.gz"

echo "=== [$(date)] Starting Database Backup ==="

# 1. Generate local PostgreSQL dump from the Docker container
echo "Running pg_dump inside container [${DB_CONTAINER}]..."
docker exec "${DB_CONTAINER}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" > "${BACKUP_FILEPATH}"

# 2. Compress the dump file
echo "Compressing backup file..."
gzip -9 "${BACKUP_FILEPATH}"
echo "Backup compressed successfully: ${GZIP_FILEPATH}"

# 3. Securely copy to Backup VPS
echo "Transferring backup offsite to ${BACKUP_VPS_USER}@${BACKUP_VPS_HOST}:${BACKUP_VPS_PORT}..."
if [ -f "${BACKUP_SSH_KEY}" ]; then
    # Create the remote directory if it doesn't exist
    ssh -i "${BACKUP_SSH_KEY}" -p "${BACKUP_VPS_PORT}" -o StrictHostKeyChecking=no "${BACKUP_VPS_USER}@${BACKUP_VPS_HOST}" "mkdir -p ${BACKUP_VPS_PATH}"
    
    # SCP the compressed dump
    scp -i "${BACKUP_SSH_KEY}" -P "${BACKUP_VPS_PORT}" -o StrictHostKeyChecking=no "${GZIP_FILEPATH}" "${BACKUP_VPS_USER}@${BACKUP_VPS_HOST}:${BACKUP_VPS_PATH}/"
    echo "Offsite backup transfer complete."
else
    echo "WARNING: SSH key file [${BACKUP_SSH_KEY}] not found. Skipping offsite transfer."
fi

# 4. Clean up local backups older than LOCAL_RETENTION_DAYS
echo "Applying local retention policy (cleaning up backups older than ${LOCAL_RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -name "${DB_NAME}_backup_*.sql.gz" -type f -mtime +"${LOCAL_RETENTION_DAYS}" -exec rm -f {} \; -print
echo "Local cleanup finished."

# 5. Clean up remote backups older than REMOTE_RETENTION_DAYS
if [ -f "${BACKUP_SSH_KEY}" ]; then
    echo "Applying remote retention policy (cleaning up remote backups older than ${REMOTE_RETENTION_DAYS} days)..."
    ssh -i "${BACKUP_SSH_KEY}" -p "${BACKUP_VPS_PORT}" -o StrictHostKeyChecking=no "${BACKUP_VPS_USER}@${BACKUP_VPS_HOST}" \
        "find ${BACKUP_VPS_PATH} -name '${DB_NAME}_backup_*.sql.gz' -type f -mtime +${REMOTE_RETENTION_DAYS} -exec rm -f {} \;"
    echo "Remote cleanup finished."
fi

echo "=== [$(date)] Backup Job Complete ==="
