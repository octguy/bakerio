#!/usr/bin/env bash
# One-time TLS bootstrap for the bakerio VPS.
#
# Problem this solves: nginx.conf references Let's Encrypt certs that do not
# exist on a fresh box (only DNS A records were created). nginx refuses to
# start without them, but the ACME HTTP-01 challenge needs nginx serving :80.
#
# This script breaks the deadlock:
#   1. Plant a temporary self-signed cert so nginx can boot.
#   2. Bring up nginx (serves the /.well-known/acme-challenge webroot on :80).
#   3. Run certbot webroot to obtain the real cert.
#   4. Reload nginx with the real cert.
#
# Run ONCE on the VPS:
#   cd /home/deploy/bakerio/backend/deployments && ./init-letsencrypt.sh
#
# Idempotent: re-running with an existing real cert is a no-op unless --force.

set -euo pipefail

cd "$(dirname "$0")"

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.prod"

# --cert-name is only the directory label under /etc/letsencrypt/live; it does
# NOT need to be a resolvable domain. nginx.conf points at this path.
CERT_NAME="bakerio.thinhuit.id.vn"

# SANs actually placed in the cert. Every domain here is validated via HTTP-01,
# so each MUST resolve to this VPS and be served on :80 by nginx. The apex
# bakerio.thinhuit.id.vn has no A record and nginx does not serve it, so it is
# intentionally excluded.
DOMAINS=(
  "api.bakerio.thinhuit.id.vn"
  "order.bakerio.thinhuit.id.vn"
  "admin.bakerio.thinhuit.id.vn"
)

# Set EMAIL before running, or export it inline:  EMAIL=you@example.com ./init-letsencrypt.sh
EMAIL="${EMAIL:-admin@thinhuit.id.vn}"

# Set STAGING=1 to hit Let's Encrypt staging (avoids rate limits while testing).
STAGING="${STAGING:-0}"
FORCE="${1:-}"

LE_PATH="/etc/letsencrypt"
LIVE_PATH="${LE_PATH}/live/${CERT_NAME}"
LIVE_CERT="${LIVE_PATH}/fullchain.pem"

# A real cert is issued by Let's Encrypt (prod or staging). A self-signed dummy
# planted by this script has issuer CN=${CERT_NAME}, so it must NOT count as done.
cert_is_real() {
  sudo openssl x509 -in "${LIVE_CERT}" -noout -issuer 2>/dev/null \
    | grep -qiE "let's encrypt|fake le|staging"
}

if [ -f "${LIVE_CERT}" ] && cert_is_real && [ "${FORCE}" != "--force" ]; then
  echo "Real certificate already present at ${LIVE_PATH}."
  echo "Nothing to do. Re-run with --force to recreate."
  exit 0
fi

# Plant a 1-day self-signed cert ONLY when nginx has nothing to load. If a dummy
# from a previous failed run is already here, leave it; nginx can boot on it.
if [ ! -f "${LIVE_CERT}" ]; then
  echo "### 1/4  Planting temporary self-signed cert so nginx can boot ..."
  sudo mkdir -p "${LIVE_PATH}"
  sudo openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "${LIVE_PATH}/privkey.pem" \
    -out "${LIVE_CERT}" \
    -subj "/CN=${CERT_NAME}"
else
  echo "### 1/4  Cert file already present; skipping dummy generation."
fi

echo "### 2/4  Starting nginx (serves ACME webroot on :80) ..."
# --no-deps: do NOT (re)create app/order/admin. Their images may be missing or
# mid-deploy; nginx only needs to serve the ACME webroot here. An already-running
# nginx is reloaded in step 4 regardless.
${COMPOSE} up -d --no-deps nginx
sleep 3

echo "### 3/4  Requesting real certificate from Let's Encrypt ..."
# Remove the dummy/old lineage so certbot writes a clean one.
sudo rm -rf "${LIVE_PATH}" \
  "${LE_PATH}/archive/${CERT_NAME}" \
  "${LE_PATH}/renewal/${CERT_NAME}.conf"

domain_args=()
for d in "${DOMAINS[@]}"; do
  domain_args+=("-d" "$d")
done

staging_arg=()
if [ "${STAGING}" != "0" ]; then
  echo "    (using STAGING endpoint)"
  staging_arg=("--staging")
fi

${COMPOSE} run --rm --no-deps --entrypoint certbot certbot \
  certonly --webroot -w /var/www/certbot \
  --cert-name "${CERT_NAME}" \
  "${domain_args[@]}" \
  --email "${EMAIL}" \
  --agree-tos --no-eff-email \
  --non-interactive \
  "${staging_arg[@]}"

echo "### 4/4  Reloading nginx with the real certificate ..."
${COMPOSE} exec nginx nginx -s reload

echo
echo "Done. Certificate installed for: ${DOMAINS[*]}"
echo "The certbot service will auto-renew; nginx reloads every 6h to pick up renewals."
