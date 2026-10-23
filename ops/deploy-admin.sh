#!/usr/bin/env bash
# Deploy the LEGACY-X staff site (admin.legacyx.cc) on the VPS: pull main, build the admin entry, publish to its own web root.
#
#   bash ops/deploy-admin.sh
#
# Override the defaults when your paths differ:
#   ADMIN_WEB_ROOT=/var/www/legacyx-admin API_URL=https://api.legacyx.cc bash ops/deploy-admin.sh
set -euo pipefail

ADMIN_WEB_ROOT="${ADMIN_WEB_ROOT:-/var/www/legacyx-admin}"
API_URL="${API_URL:-https://api.legacyx.cc}"
BRANCH="${BRANCH:-main}"

cd "$(dirname "$0")/.."

echo "==> Pulling $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "==> Installing dependencies"
npm ci

echo "==> Building the staff site for $API_URL"
VITE_API_URL="$API_URL" npm run build:admin

if grep -q "mock-session" dist-admin/assets/*.js; then
  echo "!! Build contains mock code - aborting, nothing was published" >&2
  exit 1
fi

echo "==> Publishing to $ADMIN_WEB_ROOT"
DIST="$(pwd)/dist-admin"
sudo mkdir -p "$ADMIN_WEB_ROOT/assets"
# Hashed assets first and the page last, so nobody mid-deploy gets a page that points at files that are not there yet.
sudo cp -a "$DIST/assets/." "$ADMIN_WEB_ROOT/assets/"
find "$DIST" -mindepth 1 -maxdepth 1 ! -name assets ! -name admin.html -exec sudo cp -a {} "$ADMIN_WEB_ROOT/" \;
sudo cp -a "$DIST/admin.html" "$ADMIN_WEB_ROOT/index.html"
for old in "$ADMIN_WEB_ROOT"/assets/*; do
  [ -e "$DIST/assets/$(basename "$old")" ] || sudo rm -rf -- "$old"
done

echo "==> Reloading Nginx"
sudo nginx -t
sudo systemctl reload nginx

echo "==> Done: $(git log -1 --format='%h %s')"
