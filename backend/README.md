# Backend (Express + Prisma)

REST API for the Service & Spare Parts Management System.

## Run locally

```bash
cd backend
npm install
cp .env.example .env        # then set JWT_SECRET to a long random string
npm run setup               # creates the SQLite database and loads the demo data
npm run dev                 # http://localhost:4000, API docs at http://localhost:4000/api/docs
npm test                    # Jest + Supertest against a separate test.db
```

Demo logins (password is `SEED_PASSWORD` from `.env`):

| Role | Email |
|---|---|
| Admin | admin@demo.local |
| Technician | ravi@demo.local, sanjay@demo.local, imran@demo.local |
| Customer | shree@demo.local (Shree Ganesh Pharma), kaveri@demo.local, ... |

## Code layout

```
src/
  app.js              Express app: middleware, routes, error handler
  server.js           Starts the HTTP server
  config/             env loading, Prisma client, allowed status/type values
  middleware/         auth (JWT + requireRole), validate (Zod), errorHandler
  utils/              ApiError, pagination/search helpers, date helpers
  modules/<name>/     <name>.routes.js -> <name>.controller.js, with <name>.schema.js for validation
prisma/
  schema.prisma       Database model
  seed.js             Demo data
openapi.yaml          API documentation served at /api/docs
```

Every request goes: **route** (which roles may call it) → **validate** (Zod checks the input) → **controller** (Prisma query) → JSON response. Any error thrown along the way is turned into `{ "error": { "code", "message", "details" } }` by `errorHandler.js`.
