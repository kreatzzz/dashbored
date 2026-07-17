#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.docker.local"
PROJECT_NAME="dashbored-local"
ACTION="${1:-up}"

cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed or is not on PATH." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker Desktop is not running. Start it, then run this command again." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  umask 077
  POSTGRES_PASSWORD_VALUE="$(openssl rand -hex 24)"
  BETTER_AUTH_SECRET_VALUE="$(openssl rand -hex 32)"
  CREDENTIAL_MASTER_KEY_VALUE="$(openssl rand -base64 32)"
  BOOTSTRAP_PASSWORD_VALUE="$(openssl rand -base64 24 | tr -d '\n')"
  cat > "$ENV_FILE" <<EOF
POSTGRES_PASSWORD=$POSTGRES_PASSWORD_VALUE
BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET_VALUE
CREDENTIAL_MASTER_KEY=$CREDENTIAL_MASTER_KEY_VALUE
BETTER_AUTH_URL=http://localhost:43821
BOOTSTRAP_EMAIL=admin@example.com
BOOTSTRAP_PASSWORD=$BOOTSTRAP_PASSWORD_VALUE
DASHBOARD_BIND_ADDRESS=127.0.0.1
DASHBOARD_PORT=43821
POLL_INTERVAL_MS=60000
EOF
  echo "Created private local Docker configuration at .env.docker.local"
fi

compose() {
  docker compose --project-name "$PROJECT_NAME" --env-file "$ENV_FILE" "$@"
}

case "$ACTION" in
  up)
    compose up -d --build
    echo
    compose ps
    echo
    echo "Dashbored is starting at http://localhost:43821"
    echo "Credentials are stored in the private .env.docker.local file."
    echo "Use 'bun run docker:local:logs' to follow startup logs."
    ;;
  down)
    compose down
    ;;
  logs)
    compose logs -f --tail=150 dashboard worker postgres migrate
    ;;
  status)
    compose ps
    ;;
  *)
    echo "Usage: $0 {up|down|logs|status}" >&2
    exit 2
    ;;
esac
