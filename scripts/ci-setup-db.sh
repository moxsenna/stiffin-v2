#!/bin/sh
# CI helper: prepare the GitHub Actions postgres service for B1 integration tests.
# Runs as the container superuser (postgres) — equivalent of owner authority.
# Note: GH Actions service containers are reached via TCP on localhost, not unix socket.
set -eu

DB_NAME="${1:-postgres}"
export PGPASSWORD="${POSTGRES_PASSWORD:-postgres}"

psql -v ON_ERROR_STOP=1 -h localhost -U postgres -d "$DB_NAME" <<'SQL'
CREATE ROLE promotor_runtime LOGIN PASSWORD 'ci_runtime_pw';
SQL

# Apply migrations (owner authority)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/${DB_NAME}" \
  pnpm --filter @promotor/platform-api db:migrate

# Apply least-privilege runtime grants for the five B1 tables
psql -v ON_ERROR_STOP=1 -h localhost -U postgres -d "$DB_NAME" \
  -f docs/sql/grants_b1.sql

# Apply least-privilege runtime grants for the five B2 auth tables
psql -v ON_ERROR_STOP=1 -h localhost -U postgres -d "$DB_NAME" \
  -f docs/sql/grants_b2.sql

# Apply least-privilege runtime grants for the six B3 content tables
psql -v ON_ERROR_STOP=1 -h localhost -U postgres -d "$DB_NAME" \
  -f docs/sql/grants_b3.sql

# Apply least-privilege runtime grants for the eight B6 Flow tables
psql -v ON_ERROR_STOP=1 -h localhost -U postgres -d "$DB_NAME" \
  -f docs/sql/grants_b6.sql

# Apply least-privilege runtime grants for B6.1 availability rules
psql -v ON_ERROR_STOP=1 -h localhost -U postgres -d "$DB_NAME" \
  -f docs/sql/grants_b6.1.sql

# Apply least-privilege runtime grants for B4 registration and enrollments
psql -v ON_ERROR_STOP=1 -h localhost -U postgres -d "$DB_NAME" \
  -f docs/sql/grants_b4.sql

# Apply least-privilege runtime grants for B5 learning engine
psql -v ON_ERROR_STOP=1 -h localhost -U postgres -d "$DB_NAME" \
  -f docs/sql/grants_b5.sql
