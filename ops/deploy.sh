#!/usr/bin/env bash
# Deploy the LEGACY-X frontend on the VPS: pull main, build, publish to the Nginx web root.
#
#   bash ops/deploy.sh
#
# Override the defaults when your paths differ:
#   WEB_ROOT=/var/www/legacyx API_URL=https://api.legacyx.cc BRANCH=main bash ops/deploy.sh
set -euo pipefail

WEB_ROOT="${WEB_ROOT:-/var/www/legacyx}"
API_URL="${API_URL:-https://api.legacyx.cc}"
BRANCH="${BRANCH:-main}"

cd "$(dirname "$0")/.."

echo "==> Node $(node -v) (needs 20.19+ or 22.12+)"

echo "==> Pulling $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "==> Installing dependencies"
npm ci

echo "==> Building for $API_URL"
VITE_API_URL="$API_URL" npm run build

# The production bundle must never contain the local preview's sample data.
if grep -q "mock-session" dist/assets/*.js; then
  echo "!! Build contains mock code - aborting, nothing was published" >&2
  exit 1
fi

echo "==> Publishing to $WEB_ROOT"
DIST="$(pwd)/dist"
sudo mkdir -p "$WEB_ROOT/assets"
# Hashed assets first and index.html last, so a visitor mid-deploy never gets an index that points
# at files that are not there yet.
sudo cp -a "$DIST/assets/." "$WEB_ROOT/assets/"
find "$DIST" -mindepth 1 -maxdepth 1 ! -name assets ! -name index.html -exec sudo cp -a {} "$WEB_ROOT/" \;
sudo cp -a "$DIST/index.html" "$WEB_ROOT/index.html"
# Then drop assets left over from older builds (only inside $WEB_ROOT/assets).
for old in "$WEB_ROOT"/assets/*; do
  [ -e "$DIST/assets/$(basename "$old")" ] || sudo rm -rf -- "$old"
done

echo "==> Reloading Nginx"
sudo nginx -t
sudo systemctl reload nginx

echo "==> Done: $(git log -1 --format='%h %s')"
