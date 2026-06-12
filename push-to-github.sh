#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/absurdfounder/video-analysis.git}"
REPO_DIR="${REPO_DIR:-video-analysis}"
TARGET_BRANCH="${TARGET_BRANCH:-add-transcript-miner}"
COMMIT_MESSAGE="${COMMIT_MESSAGE:-Add timestamped YouTube transcript miner}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/app"

if ! command -v git >/dev/null 2>&1; then
  echo "git is not installed. Install git first."
  exit 1
fi

if [ ! -d "$APP_DIR" ]; then
  echo "App files not found at: $APP_DIR"
  exit 1
fi

if [ -d "$REPO_DIR/.git" ]; then
  echo "Using existing repo folder: $REPO_DIR"
  cd "$REPO_DIR"
  git fetch origin
else
  echo "Cloning $REPO_URL into $REPO_DIR"
  git clone "$REPO_URL" "$REPO_DIR"
  cd "$REPO_DIR"
fi

if git show-ref --verify --quiet "refs/heads/$TARGET_BRANCH"; then
  git checkout "$TARGET_BRANCH"
else
  git checkout -B "$TARGET_BRANCH"
fi

# Remove the old lowercase placeholder readme if present.
git rm -f readme 2>/dev/null || true

# Copy app files into repo root.
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.env' \
    --exclude='*.csv' \
    --exclude='*.json' \
    "$APP_DIR/" ./
else
  echo "rsync missing. Falling back to cp."
  find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
  cp -R "$APP_DIR/." ./
fi

git add .

if git diff --cached --quiet; then
  echo "No changes to commit."
else
  git commit -m "$COMMIT_MESSAGE"
fi

echo "Pushing branch: $TARGET_BRANCH"
git push -u origin "$TARGET_BRANCH"

echo "Done. Open GitHub and create a PR, or merge the branch into main."
