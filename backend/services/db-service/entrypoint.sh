#!/bin/sh
set -e

DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# On a brand-new volume, the official Postgres image restarts itself once after initdb
# before it's actually ready for real traffic, but the pg_isready healthcheck can report
# "healthy" during that transient first startup — a connection made in that window gets
# dropped mid-migration. Retry instead of failing hard on that one-time race.
attempt=1
until yoyo apply --database "$DATABASE_URL" --batch ./migrations; do
  if [ "$attempt" -ge 10 ]; then
    echo "yoyo apply failed after $attempt attempts, giving up" >&2
    exit 1
  fi
  echo "yoyo apply failed (attempt $attempt), retrying in 2s..." >&2
  attempt=$((attempt + 1))
  sleep 2
done

exec uvicorn main:app --host 0.0.0.0 --port 8001
