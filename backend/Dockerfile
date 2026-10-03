# Backend API image (used by docker-compose with PostgreSQL)
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Switch Prisma from SQLite (local dev) to PostgreSQL, then generate the client.
RUN node scripts/use-postgres.js && npx prisma generate

EXPOSE 4000
CMD ["sh", "scripts/docker-start.sh"]
