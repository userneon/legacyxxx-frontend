#!/usr/bin/env bash
# Pre-launch countdown at the web server: until you open the site, every visitor gets a static countdown
# page and nothing else (the real pages and the app bundle are not served at all).
#
#   sudo bash ops/gate.sh on       # create/refresh the gate, print the team's preview link
#   sudo bash ops/gate.sh off      # open the site to everyone (instant, no reload)
#   sudo bash ops/gate.sh status
#
# One-time setup: add this line to the legacyx.cc server block, ABOVE the legacyx-frontend.conf include:
#   include /etc/nginx/snippets/legacyx-gate.conf;
set -euo pipefail

GATE_DIR="${GATE_DIR:-/var/www/legacyx-gate}"
SNIPPET="${SNIPPET:-/etc/nginx/snippets/legacyx-gate.conf}"
SITE="${SITE:-https://legacyx.cc}"
HERE="$(cd "$(dirname "$0")" && pwd)"

case "${1:-status}" in
  on)
    mkdir -p "$GATE_DIR"
    cp "$HERE/gate/countdown.html" "$GATE_DIR/countdown.html"
    rm -f "$GATE_DIR/OPEN"
    # Keep the same preview key across refreshes; make a new one by deleting $GATE_DIR/secret.
    [ -s "$GATE_DIR/secret" ] || { umask 077; openssl rand -hex 12 > "$GATE_DIR/secret"; }
    SECRET="$(cat "$GATE_DIR/secret")"
    sed -e "s#__SECRET__#$SECRET#g" -e "s#__GATE_DIR__#$GATE_DIR#g" "$HERE/gate/legacyx-gate.conf.template" > "$SNIPPET"
    if ! grep -rqs "legacyx-gate.conf" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null; then
      echo "!! Add 'include $SNIPPET;' to the legacyx.cc server block (above the legacyx-frontend.conf include), then run this again." >&2
    fi
    nginx -t
    systemctl reload nginx
    echo "Gate is ON. Team preview link (opens the real site in that browser for 30 days):"
    echo "  $SITE/__preview/$SECRET"
    ;;
  off)
    mkdir -p "$GATE_DIR"
    touch "$GATE_DIR/OPEN"
    echo "Gate is OFF: the site is open to everyone."
    ;;
  status)
    if [ -f "$GATE_DIR/OPEN" ]; then echo "Gate is OFF (open)"; elif [ -f "$SNIPPET" ]; then echo "Gate is ON"; else echo "Gate is not set up"; fi
    ;;
  *) echo "usage: $0 on|off|status" >&2; exit 2 ;;
esac
