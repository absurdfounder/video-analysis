#!/usr/bin/env bash
set -euo pipefail

REPO="https://github.com/absurdfounder/video-analysis.git"
BRANCH="${TARGET_BRANCH:-netlify-functions-fix}"
WORKDIR="/tmp/video-analysis-netlify-fix-$$"

rm -rf "$WORKDIR"
git clone "$REPO" "$WORKDIR"
cd "$WORKDIR"

git checkout -B "$BRANCH"

# Copy patch contents into repo root.
rsync -av --delete --exclude='.git' "$(dirname "$0")/app/" "app/"
cp "$(dirname "$0")/netlify.toml" "netlify.toml"

# Keep existing root README if present, but add deploy docs.
cp "$(dirname "$0")/PUSH_NETLIFY_FIX.md" "NETLIFY_FIX.md"

git add app netlify.toml NETLIFY_FIX.md
git commit -m "Add Netlify functions for video transcript analysis" || echo "No changes to commit"
git push -u origin "$BRANCH"

echo "Pushed branch: $BRANCH"
echo "Open PR: https://github.com/absurdfounder/video-analysis/pull/new/$BRANCH"
