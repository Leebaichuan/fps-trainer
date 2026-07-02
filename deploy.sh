#!/bin/bash
# FPS Aim Trainer — One-click Deploy
# Usage: ./deploy.sh "commit message"
#        ./deploy.sh              (uses timestamp as message)

set -e

echo "=== FPS Aim Trainer Deploy ==="
echo ""

# Check for uncommitted changes
if git diff --quiet && git diff --cached --quiet; then
  echo "No changes to deploy."
  exit 0
fi

# Commit message: argument or auto-generated
if [ -n "$1" ]; then
  MSG="$1"
else
  MSG="Update — $(date '+%Y-%m-%d %H:%M')"
fi

echo "Changes to deploy:"
git status --short
echo ""

echo "Commit: $MSG"
git add -A
git commit -m "$MSG"

echo ""
echo "Pushing to GitHub..."
git push

echo ""
echo "=== Done! ==="
echo "Live in ~1min: https://leebaichuan.github.io/fps-trainer/"
