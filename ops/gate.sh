#!/usr/bin/env bash
# Pre-launch Coming Soon at the web server: until the launch every visitor gets the Coming Soon site (its own small build, `npm run build:soon`, which ops/deploy.sh
# publishes into $GATE_DIR/soon) and nothing else: the real pages and the real app bundle are not served at all, so F12, the computer's clock or refreshing cannot open them.
# At the launch time the gate opens by itself (a systemd timer touches $GATE_DIR/OPEN); the launch time is LAUNCH_AT (UTC), 2026-12-11 16:00 = 12 December 00:00 in Ulaanbaatar.
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
LAUNCH_AT="${LAUNCH_AT:-2026-12-11 16:00:00 UTC}"
HERE="$(cd "$(dirname "$0")" && pwd)"

case "${1:-status}" in
  on)
    mkdir -p "$GATE_DIR"
    # The Coming Soon site comes from ops/deploy.sh; until a deploy has put it there, the plain countdown page stands in.
    if [ ! -f "$GATE_DIR/soon/index.html" ]; then
      mkdir -p "$GATE_DIR/soon"
      cp "$HERE/gate/countdown.html" "$GATE_DIR/soon/index.html"
      echo "!! $GATE_DIR/soon has no Coming Soon build yet: run 'bash ops/deploy.sh' to put it there (the old countdown page is shown meanwhile)." >&2
    fi
    rm -f "$GATE_DIR/OPEN"
    # Open by itself at the launch time (replaces an earlier timer).
    if command -v systemd-run >/dev/null 2>&1; then
      systemctl stop lx-gate-open.timer 2>/dev/null || true
      systemd-run --unit=lx-gate-open --on-calendar="$LAUNCH_AT" --timer-property=AccuracySec=1s /usr/bin/touch "$GATE_DIR/OPEN" >/dev/null && echo "The gate opens by itself at $LAUNCH_AT."
    fi
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
    systemctl stop lx-gate-open.timer 2>/dev/null || true
    echo "Gate is OFF: the site is open to everyone."
    ;;
  status)
    if [ -f "$GATE_DIR/OPEN" ]; then echo "Gate is OFF (open)"; elif [ -f "$SNIPPET" ]; then echo "Gate is ON"; else echo "Gate is not set up"; fi
    ;;
  *) echo "usage: $0 on|off|status" >&2; exit 2 ;;
esac
