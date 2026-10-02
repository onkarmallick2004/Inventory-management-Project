#!/bin/sh
# Container start-up: create/update tables, load demo data on first run, start the API.
set -e
npx prisma db push --skip-generate
node scripts/seed-if-empty.js
exec node src/server.js
