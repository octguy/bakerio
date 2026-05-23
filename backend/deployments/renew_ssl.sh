#!/bin/bash

# ==============================================================================
# Bakerio SSL Certificate Renewal and Nginx Reload Script
# ==============================================================================
# This script is intended to run as a cron job on the main host VPS.
# It checks and renews Let's Encrypt certificates, then reloads the production
# Nginx container so that it hot-reloads the newly issued SSL files without downtime.
#
# Recommended execution: Weekly (e.g. every Sunday at 3 AM).
# ==============================================================================

# Exit immediately if a command exits with a non-zero status
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.prod.yml"
NGINX_CONTAINER="bakerio-nginx"

echo "=== [$(date)] Starting SSL Renewal Check ==="

# 1. Run Certbot renewal on the host system
# Certbot only renews if the certificate is within 30 days of expiration.
if command -v certbot &> /dev/null; then
    echo "Running certbot renew on the host..."
    # We use --non-interactive and --post-hook to log status
    certbot renew --non-interactive
    echo "Certbot check finished."
else
    echo "WARNING: certbot CLI not found on host. If certificates are managed"
    echo "by another process, please verify they are being renewed correctly."
fi

# 2. Reload Nginx configuration in the Docker container to apply new keys
# Reloading Nginx via SIGHUP (nginx -s reload) does not drop active connections.
echo "Reloading Nginx configuration inside container [${NGINX_CONTAINER}]..."
if [ "$(docker ps -q -f name=${NGINX_CONTAINER})" ]; then
    docker exec -t "${NGINX_CONTAINER}" nginx -s reload
    echo "Nginx reloaded successfully. New certificates loaded."
else
    echo "ERROR: Nginx container [${NGINX_CONTAINER}] is not running. Reload skipped."
    exit 1
fi

echo "=== [$(date)] SSL Renewal Job Complete ==="
