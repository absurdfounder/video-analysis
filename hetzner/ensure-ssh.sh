#!/usr/bin/env bash
set -euo pipefail

# Ensures ~/.ssh/hetzner is loaded and matches Hetzner console fingerprint.
KEY="${SSH_KEY:-$HOME/.ssh/hetzner}"
EXPECTED_FP="50:8f:83:55:6d:84:33:20:e4:c5:9e:97:30:80:7f:b4"

if [[ ! -f "$KEY" ]]; then
  echo "Missing private key: $KEY"
  exit 1
fi

ACTUAL_FP="$(ssh-keygen -lf "${KEY}.pub" -E md5 2>/dev/null | awk '{print $2}' | sed 's/^MD5://')"
if [[ "$ACTUAL_FP" != "$EXPECTED_FP" ]]; then
  echo "Key fingerprint mismatch. Expected $EXPECTED_FP got ${ACTUAL_FP:-unknown}"
  exit 1
fi

chmod 600 "$KEY" 2>/dev/null || true
ssh-add "$KEY" 2>/dev/null || true

echo "SSH key ready: $KEY ($ACTUAL_FP)"
