# Sourced by deploy.sh and deploy-admin.sh from the repository root (owner request 2026-11-18: every address from one place).
# The site's addresses come from the one DOMAIN line, the same line the API's, the bot's and the plugins' .env use. DOMAIN is read from the environment, or from
# a DOMAIN= line in this repository's .env. Then (each can still be set on its own and wins):
#   API_URL           https://api.<host>
#   VITE_SITE_URL     <DOMAIN>
#   VITE_ADMIN_URL    $STAFF_PANEL, else https://admin.<host>
if [ -z "${DOMAIN:-}" ] && [ -f .env ]; then
  # No DOMAIN line is fine (grep then fails, which must not stop a script that runs with set -e and pipefail).
  DOMAIN="$({ grep -E '^DOMAIN=' .env || true; } | head -1 | cut -d= -f2- | tr -d "\"'" | tr -d '\r')"
fi
if [ -n "${DOMAIN:-}" ]; then
  DOMAIN="${DOMAIN%/}"
  _host="${DOMAIN#*://}"
  _host="${_host%%/*}"
  API_URL="${API_URL:-https://api.${_host}}"
  export VITE_SITE_URL="${VITE_SITE_URL:-$DOMAIN}"
  export VITE_ADMIN_URL="${VITE_ADMIN_URL:-${STAFF_PANEL:-https://admin.${_host}}}"
fi
API_URL="${API_URL:-https://api.legacyx.cc}"

# "Coming soon" (owner request 2026-11-20): COMING_SOON=true (environment or a line of this repository's .env) builds the site as one Coming Soon page until the launch time (2026-12-12 00:00
# Ulaanbaatar, lib/coming-soon.ts; it opens by itself then). PREVIEW_KEY=<key> lets a browser that opens any address with ?preview=<key> see the real site. Remove the line and deploy to switch it off at once.
_read_env() { { grep -E "^$1=" .env 2>/dev/null || true; } | head -1 | cut -d= -f2- | tr -d "\"'" | tr -d '\r'; }
COMING_SOON="${COMING_SOON:-$(_read_env COMING_SOON)}"
PREVIEW_KEY="${PREVIEW_KEY:-$(_read_env PREVIEW_KEY)}"
if [ "${COMING_SOON:-}" = "true" ]; then
  export VITE_COMING_SOON=true
  [ -n "${PREVIEW_KEY:-}" ] && export VITE_PREVIEW_KEY="$PREVIEW_KEY"
fi
