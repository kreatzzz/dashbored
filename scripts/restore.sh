#!/usr/bin/env bash
set -euo pipefail

# This replaces the Dashbored database from a logical .sql or .sql.gz backup.
# It does not replace .env: the original credential master key is required to
# decrypt existing service credentials after the import.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARCHIVE="${1:-}"
CONFIRMATION="${2:-}"

if [[ -z "$ARCHIVE" || "$CONFIRMATION" != "--confirm=RESTORE" ]]; then
  echo "Usage: $0 /path/to/dashbored.sql[.gz] --confirm=RESTORE" >&2
  echo "This permanently replaces the current Dashbored PostgreSQL database." >&2
  exit 2
fi

if [[ ! -f "$ARCHIVE" ]]; then
  echo "Backup archive not found: $ARCHIVE" >&2
  exit 1
fi

compose_args=()
if [[ -n "${DASHBORED_COMPOSE_PROJECT:-}" ]]; then
  compose_args+=(--project-name "$DASHBORED_COMPOSE_PROJECT")
fi
if [[ -n "${DASHBORED_COMPOSE_ENV_FILE:-}" ]]; then
  compose_args+=(--env-file "$DASHBORED_COMPOSE_ENV_FILE")
fi

compose() {
  docker compose "${compose_args[@]}" "$@"
}

verify_checksum() {
  local checksum="$ARCHIVE.sha256"
  [[ -f "$checksum" ]] || return 0
  if command -v shasum >/dev/null 2>&1; then
    (cd "$(dirname "$checksum")" && shasum -a 256 -c "$(basename "$checksum")")
  else
    (cd "$(dirname "$checksum")" && sha256sum -c "$(basename "$checksum")")
  fi
}

cd "$ROOT_DIR"
verify_checksum

if ! compose ps --status running --services | grep -qx postgres; then
  echo "Dashbored PostgreSQL is not running. Start the Compose stack first." >&2
  exit 1
fi

echo "Stopping Dashbored web and worker services before restore..."
compose stop dashboard worker migrate

echo "Replacing database contents from $ARCHIVE..."
compose exec -T postgres dropdb --if-exists -U dashbored dashbored
compose exec -T postgres createdb -U dashbored dashbored
if [[ "$ARCHIVE" == *.gz ]]; then
  gzip -dc "$ARCHIVE" | compose exec -T postgres psql -v ON_ERROR_STOP=1 -U dashbored -d dashbored
else
  compose exec -T postgres psql -v ON_ERROR_STOP=1 -U dashbored -d dashbored < "$ARCHIVE"
fi

echo "Starting Dashbored so migrations and health checks can complete..."
compose up -d
echo "Restore completed. Sign in and verify service connections without triggering an action."
