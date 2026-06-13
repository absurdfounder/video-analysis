#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Fruit Mandi — Cloudflare D1 + Worker setup"
echo

if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js/npm not found. Install from https://nodejs.org/ then re-run:"
  echo "  ./cloudflare/setup.sh"
  exit 1
fi

npm install

WHOAMI=$(npx wrangler whoami 2>&1 || true)
if echo "$WHOAMI" | grep -qi "not authenticated"; then
  echo "==> Log in to Cloudflare (browser will open)"
  npx wrangler login
  WHOAMI=$(npx wrangler whoami 2>&1)
fi

echo "==> Whoami:"
echo "$WHOAMI"
if echo "$WHOAMI" | grep -qi "not authenticated"; then
  echo "Login failed. Run:  cd cloudflare && npx wrangler login"
  exit 1
fi

if grep -q '00000000-0000-0000-0000-000000000000' wrangler.toml; then
  echo "==> Creating D1 database 'fruit-mandi'..."
  CREATE_OUT=$(npx wrangler d1 create fruit-mandi 2>&1) || true
  echo "$CREATE_OUT"
  if echo "$CREATE_OUT" | grep -qi "already exists"; then
    echo "==> Database already exists — fetching id..."
    CREATE_OUT=$(npx wrangler d1 list 2>&1)
    echo "$CREATE_OUT"
  fi
  DB_ID=$(echo "$CREATE_OUT" | sed -n 's/.*database_id = "\([^"]*\)".*/\1/p' | head -1)
  if [ -z "$DB_ID" ]; then
    DB_ID=$(echo "$CREATE_OUT" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
  fi
  if [ -n "$DB_ID" ]; then
    if sed --version >/dev/null 2>&1; then
      sed -i "s/database_id = \"00000000-0000-0000-0000-000000000000\"/database_id = \"$DB_ID\"/" wrangler.toml
    else
      sed -i '' "s/database_id = \"00000000-0000-0000-0000-000000000000\"/database_id = \"$DB_ID\"/" wrangler.toml
    fi
    echo "==> Updated wrangler.toml with database_id: $DB_ID"
  else
    echo "Could not parse database_id. Paste it manually into wrangler.toml"
    exit 1
  fi
else
  echo "==> database_id already set in wrangler.toml"
fi

echo "==> Running schema migration (remote D1)..."
npx wrangler d1 execute fruit-mandi --remote --file=./schema.sql

echo "==> Deploying Worker..."
DEPLOY_OUT=$(npx wrangler deploy 2>&1)
echo "$DEPLOY_OUT"

WORKER_URL=$(echo "$DEPLOY_OUT" | grep -oE 'https://[a-zA-Z0-9._-]+\.workers\.dev' | head -1)
if [ -z "$WORKER_URL" ]; then
  WORKER_URL="https://fruit-mandi-api.$(npx wrangler whoami 2>/dev/null | grep -oE 'Account Name:.*' || echo YOUR_SUBDOMAIN).workers.dev"
fi

echo
echo "============================================"
echo " DONE"
echo "============================================"
echo "API URL:  $WORKER_URL"
echo
echo "Test:     curl $WORKER_URL/api/health"
echo
echo "Extension Settings:"
echo "  API URL:    $WORKER_URL"
echo "  Sync token: (optional) set SYNC_TOKEN in Cloudflare dashboard"
echo
echo "Optional — set sync token on Worker:"
echo "  Cloudflare Dashboard → Workers → fruit-mandi-api → Settings → Variables"
echo "  Add SYNC_TOKEN = your-secret"
echo "============================================"
