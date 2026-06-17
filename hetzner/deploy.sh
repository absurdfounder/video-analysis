#!/usr/bin/env bash
set -euo pipefail

# One-command deploy: SSH key → rsync → server setup → Worker points to Hetzner
# Usage: ./hetzner/deploy.sh [server_ip]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -f "$SCRIPT_DIR/config.env" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/config.env"
fi

SERVER_IP="${1:-${HETZNER_IP:-167.233.120.228}}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/hetzner}"
DEPLOY_WORKER="${DEPLOY_WORKER:-1}"
EXTRACTOR_URL="http://${SERVER_IP}:3000/api/transcript"

bash "$SCRIPT_DIR/ensure-ssh.sh"
SSH_OPTS=(-i "$SSH_KEY" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new)

echo "==> Syncing to root@${SERVER_IP}:/opt/videoanalyzer"
rsync -avz --delete -e "ssh ${SSH_OPTS[*]}" \
  --exclude node_modules \
  --exclude .git \
  --exclude netlify-dist \
  --exclude hetzner/config.env \
  --exclude '**/tmp/**' \
  "$REPO_ROOT/" "root@${SERVER_IP}:/opt/videoanalyzer/"

echo "==> Running server setup"
ssh "${SSH_OPTS[@]}" "root@${SERVER_IP}" 'bash /opt/videoanalyzer/hetzner/setup.sh'

echo "==> Health check"
ssh "${SSH_OPTS[@]}" "root@${SERVER_IP}" 'curl -fsS http://127.0.0.1:3000/api/health; echo'

if [[ "$DEPLOY_WORKER" == "1" ]]; then
  echo "==> Updating Cloudflare Worker YOUTUBE_EXTRACTOR_URL → $EXTRACTOR_URL"
  WRANGLER="$REPO_ROOT/cloudflare/wrangler.toml"
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' "s|YOUTUBE_EXTRACTOR_URL = \".*\"|YOUTUBE_EXTRACTOR_URL = \"${EXTRACTOR_URL}\"|" "$WRANGLER"
  else
    sed -i "s|YOUTUBE_EXTRACTOR_URL = \".*\"|YOUTUBE_EXTRACTOR_URL = \"${EXTRACTOR_URL}\"|" "$WRANGLER"
  fi
  if command -v npx >/dev/null 2>&1; then
    (cd "$REPO_ROOT/cloudflare" && npx wrangler deploy) || echo "Worker deploy failed — run: cd cloudflare && npx wrangler deploy"
  else
    echo "npx not found — update wrangler.toml manually and deploy Worker"
  fi
fi

cat <<EOF

============================================================
Hetzner deploy complete

Extractor: ${EXTRACTOR_URL}
Health:    http://${SERVER_IP}:3000/api/health
SSH:       ssh -i ${SSH_KEY} root@${SERVER_IP}
Logs:      ssh -i ${SSH_KEY} root@${SERVER_IP} journalctl -u videoanalyzer-extractor -f

Test transcript:
curl -X POST ${EXTRACTOR_URL} \\
  -H 'content-type: application/json' \\
  -d '{"videoUrl":"https://www.youtube.com/watch?v=WzP_gW6sBG8","id":"WzP_gW6sBG8","language":"hi"}'
============================================================
EOF
