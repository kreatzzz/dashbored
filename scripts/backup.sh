#!/usr/bin/env bash
set -euo pipefail

# Create a logical PostgreSQL backup without copying Dashbored's application
# secrets. Back up the private environment file through a secret manager or an
# encrypted backup system separately; it contains the credential master key.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${DASHBORED_BACKUP_DIR:-$ROOT_DIR/backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
ARCHIVE="$BACKUP_DIR/dashbored-$STAMP.sql.gz"
CHECKSUM="$ARCHIVE.sha256"

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

cd "$ROOT_DIR"
umask 077
mkdir -p "$BACKUP_DIR"
trap 'rm -f "$ARCHIVE" "$CHECKSUM"' ERR

if ! compose ps --status running --services | grep -qx postgres; then
  echo "Dashbored PostgreSQL is not running. Start the Compose stack first." >&2
  exit 1
fi

compose exec -T postgres pg_dump --no-owner --no-privileges -U dashbored dashbored | gzip -9 > "$ARCHIVE"
if command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "$ARCHIVE" > "$CHECKSUM"
else
  sha256sum "$ARCHIVE" > "$CHECKSUM"
fi
trap - ERR

echo "Created database backup: $ARCHIVE"
echo "Created checksum: $CHECKSUM"
echo "Back up the matching .env file separately and securely; its CREDENTIAL_MASTER_KEY is required to decrypt service credentials after a restore."
