# Architecture

```mermaid
flowchart LR
    subgraph Users
        A[Admin / Owner<br/>desktop]
        T[Technician<br/>phone]
        C[Customer<br/>portal]
        Q[Anyone on site<br/>scans machine QR]
        W[Company marketing website]
    end

    subgraph Frontend["Frontend: React + Vite + Tailwind (nginx in Docker)"]
        UI[Admin pages<br/>Technician view<br/>Customer portal]
        PUB[Public pages<br/>/m/:token QR landing<br/>/selector product selector]
    end

    subgraph Backend["Backend: Node.js + Express"]
        MW[JWT auth + role check<br/>Zod validation<br/>error handler]
        MOD[Modules: auth, users, customers,<br/>products, machines, parts, jobs,<br/>requests, alerts, dashboard, ml, public]
        SVC["Services: stockService (job close transaction)<br/>dueDateService, alertService,<br/>reminderService, mailService"]
        CRON[node-cron<br/>daily 07:00 reminders]
    end

    subgraph ML["ML service: Python + FastAPI"]
        SEL[selector/<br/>weighted scoring]
        FC[forecast/<br/>moving avg, smoothing, trend]
    end

    DB[(PostgreSQL<br/>SQLite in local dev)]
    MAIL[SMTP server<br/>console log in dev]

    A & T & C --> UI
    Q --> PUB
    W -- link --> PUB
    UI & PUB -- "REST /api (JSON)" --> MW --> MOD --> SVC
    MOD -- Prisma ORM --> DB
    SVC -- Prisma ORM --> DB
    CRON --> SVC
    SVC -- Nodemailer --> MAIL
    MOD -- "HTTP: catalog / usage history" --> SEL & FC
```

## Why it is split this way

- **One backend owns the database.** The ML service never touches the database; the backend sends it the
  data it needs (catalog, monthly parts usage) and gets results back. Each ML module can be tested and
  explained on its own with plain JSON.
- **Business rules live in services, not controllers.** `stockService.closeJob` is the one place where a job
  is closed, so stock deduction, the due-date update and request resolution always happen together inside a
  single transaction.
- **Public pages are separate routes with their own minimal layout**, so the marketing site can link to
  `/selector` or print `/m/<token>` on QR stickers without exposing any admin screens.

## Request lifecycle (example: technician closes a job)

```mermaid
sequenceDiagram
    participant T as Technician (phone)
    participant API as Express API
    participant S as stockService
    participant DB as Database

    T->>API: POST /api/jobs/42/close (Bearer JWT)
    API->>API: authenticate + requireRole(ADMIN, TECHNICIAN)
    API->>API: job 42 assigned to this technician? (else 404)
    API->>S: closeJob(42)
    S->>DB: BEGIN TRANSACTION
    S->>DB: read job, parts used, current stock
    alt any part short
        S-->>API: 409 INSUFFICIENT_STOCK (list of short parts)
        S->>DB: ROLLBACK (nothing changed)
    else enough stock
        S->>DB: decrement each part (only if stockQty >= qty)
        S->>DB: insert StockMovement rows
        S->>DB: job.status = CLOSED, closedDate = now
        S->>DB: ROUTINE? machine.nextServiceDue = now + interval
        S->>DB: linked request -> RESOLVED
        S->>DB: COMMIT
        S->>DB: create LOW_STOCK notifications if any part <= minimum
        S-->>API: job, new due date, stock after, low-stock parts
    end
    API-->>T: JSON response
```

## Daily reminder job

```mermaid
flowchart TD
    A[node-cron 07:00 Asia/Kolkata<br/>or POST /api/admin/run-reminders] --> B[alertService.upcoming]
    B --> C{For each machine}
    C -->|service due within 15 days| D[SERVICE_DUE]
    C -->|AMC ends within 30 days| E[AMC_EXPIRING]
    C -->|warranty ends within 30 days| F[WARRANTY_EXPIRING]
    D & E & F --> G{Notification for this<br/>machine + type + date exists?}
    G -->|yes| H[skip: no duplicate]
    G -->|no| I[create Notification] --> J[email customer, cc admin] --> K[emailSent = true]
    A --> L[low-stock parts without an open alert] --> M[create LOW_STOCK notification]
```

## Folder structure

```
.
├── backend/            Express API, Prisma schema + seed, Jest tests, OpenAPI spec
├── frontend/           React app (admin, technician, customer, public pages)
├── ml-service/         FastAPI: selector/ and forecast/ modules, pytest tests
├── docs/               This file, ER diagram, API reference, demo script, screenshots
├── docker-compose.yml  PostgreSQL + backend + ML + frontend
└── README.md
```
