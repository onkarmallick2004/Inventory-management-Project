# Backend API image (used by docker-compose with PostgreSQL).
# The full (non-slim) Node image already contains OpenSSL, which Prisma needs,
# so no extra packages have to be installed.
FROM node:22-bookworm
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Switch Prisma from SQLite (local dev) to PostgreSQL, then generate the client.
RUN node scripts/use-postgres.js && npx prisma generate

EXPOSE 4000
CMD ["sh", "scripts/docker-start.sh"]
