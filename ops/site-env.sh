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
