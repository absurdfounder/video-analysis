#!/usr/bin/env bash
set -euo pipefail

# Run on Hetzner as root after copying the repo to /opt/videoanalyzer
# Usage: bash /opt/videoanalyzer/hetzner/setup.sh

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXTRACTOR_DIR="$REPO_ROOT/hetzner/extractor"
SERVICE_NAME="videoanalyzer-extractor"
VENV_DIR="$EXTRACTOR_DIR/.venv"

echo "==> Updating system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl ca-certificates python3 python3-venv python3-pip

echo "==> Installing Node.js 22"
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v
npm -v

echo "==> Installing youtube-transcript-api (Python venv)"
rm -rf "$VENV_DIR"
python3 -m venv "$VENV_DIR"
PYTHON_BIN="$VENV_DIR/bin/python3"
if [[ ! -x "$PYTHON_BIN" ]]; then
  PYTHON_BIN="$VENV_DIR/bin/python"
fi
if [[ ! -x "$PYTHON_BIN" ]]; then
  echo "Python venv failed — no interpreter in $VENV_DIR/bin"
  ls -la "$VENV_DIR/bin" 2>/dev/null || true
  exit 1
fi
"$PYTHON_BIN" -m pip install --upgrade pip
"$PYTHON_BIN" -m pip install -r "$EXTRACTOR_DIR/requirements.txt"
"$PYTHON_BIN" -c "from youtube_transcript_api import YouTubeTranscriptApi; print('youtube-transcript-api OK')"

echo "==> Installing extractor dependencies"
cd "$EXTRACTOR_DIR"
npm install

echo "==> Creating environment file"
ENV_FILE="/etc/videoanalyzer-extractor.env"
if [[ ! -f "$ENV_FILE" ]]; then
  cat > "$ENV_FILE" <<EOF
PORT=3000
YTT_PYTHON=${PYTHON_BIN}
EOF
  chmod 600 "$ENV_FILE"
  echo "Created $ENV_FILE"
else
  if ! grep -q '^YTT_PYTHON=' "$ENV_FILE"; then
    echo "YTT_PYTHON=${PYTHON_BIN}" >> "$ENV_FILE"
  else
    sed -i "s|^YTT_PYTHON=.*|YTT_PYTHON=${PYTHON_BIN}|" "$ENV_FILE"
  fi
fi

echo "==> Installing systemd service"
cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=Video Analyzer Hetzner YouTube Extractor
After=network.target

[Service]
Type=simple
WorkingDirectory=${EXTRACTOR_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl restart "${SERVICE_NAME}"

echo "==> Opening firewall port 3000 (if ufw active)"
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q active; then
  ufw allow 3000/tcp || true
fi

sleep 2
curl -fsS "http://127.0.0.1:3000/api/health" || true

IP="$(curl -fsS https://api.ipify.org || hostname -I | awk '{print $1}')"
cat <<EOF

============================================================
Hetzner extractor setup complete.

Health:  http://${IP}:3000/api/health
API:     http://${IP}:3000/api/transcript
Method:  youtube-transcript-api (Python)

Next: Point Cloudflare Worker YOUTUBE_EXTRACTOR_URL to:
  http://${IP}:3000/api/transcript

Logs:    journalctl -u ${SERVICE_NAME} -f
============================================================
EOF
