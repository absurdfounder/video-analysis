#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="7c217f51-d033-4509-b683-d94029915a47"
SERVICE_NAME="video-analysis-extractor"
ENVIRONMENT_NAME="production"

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 /absolute/path/to/youtube-cookies.txt" >&2
  exit 2
fi

COOKIE_FILE="$1"
if [ ! -f "$COOKIE_FILE" ]; then
  echo "Cookie file not found: $COOKIE_FILE" >&2
  exit 2
fi

if [ ! -s "$COOKIE_FILE" ]; then
  echo "Cookie file is empty: $COOKIE_FILE" >&2
  exit 2
fi

if ! grep -q "youtube.com" "$COOKIE_FILE"; then
  echo "Cookie file does not look like a YouTube Netscape cookies.txt export." >&2
  exit 2
fi

COOKIE_B64="$(base64 -i "$COOKIE_FILE" | tr -d '\n')"

npx @railway/cli variable set "YOUTUBE_COOKIES_BASE64=$COOKIE_B64" \
  --project "$PROJECT_ID" \
  --environment "$ENVIRONMENT_NAME" \
  --service "$SERVICE_NAME" \
  --skip-deploys >/dev/null

npx @railway/cli redeploy \
  --project "$PROJECT_ID" \
  --environment "$ENVIRONMENT_NAME" \
  --service "$SERVICE_NAME"

echo "Set YOUTUBE_COOKIES_BASE64 and triggered Railway redeploy for $SERVICE_NAME."
