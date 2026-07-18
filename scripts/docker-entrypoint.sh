#!/bin/sh
set -eu

# Compose keeps the database password as a normal environment value so
# PostgreSQL can initialise with it. Encode it here before Prisma consumes the
# connection string: a valid database password may contain URL-reserved
# characters such as @, :, or #.
if [ -n "${POSTGRES_PASSWORD:-}" ]; then
  encoded_password="$(bun -e 'console.log(encodeURIComponent(process.env.POSTGRES_PASSWORD || ""))')"
  export DATABASE_URL="postgresql://dashbored:${encoded_password}@postgres:5432/dashbored"
fi

exec "$@"
