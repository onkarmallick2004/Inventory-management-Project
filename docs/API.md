# API reference

Interactive documentation (try every endpoint in the browser): **http://localhost:4000/api/docs**
(generated from [`backend/openapi.yaml`](../backend/openapi.yaml)). The ML service has its own at
http://localhost:8000/docs.

## Conventions

- Base URL: `/api`. JSON in, JSON out.
- Auth: `POST /api/auth/login` returns `{ token, user }`. Send `Authorization: Bearer <token>`.
- Lists accept `page`, `limit` (max 100), `search`, `sort=field:asc|desc` and return
  `{ "data": [...], "meta": { "page", "limit", "total", "totalPages" } }`.
- Every error has the same shape:

```json
{ "error": { "code": "INSUFFICIENT_STOCK", "message": "Not enough stock to close this job",
             "details": [{ "partNumber": "SEP-S22", "required": 9, "inStock": 2 }] } }
```

| Status | Code | When |
|---|---|---|
| 400 | `BAD_REQUEST` | Validation failed (`details` lists each field) or invalid JSON |
| 401 | `UNAUTHORIZED` / `INVALID_CREDENTIALS` | Missing/expired token, wrong password |
| 403 | `FORBIDDEN` | Your role may not do this |
| 404 | `NOT_FOUND` | Doesn't exist, or belongs to another customer/technician |
| 409 | `CONFLICT` / `INSUFFICIENT_STOCK` | Duplicate value, linked records, closed job, not enough stock |
| 503 | `ML_UNAVAILABLE` | The Python ML service is not running |

## Endpoints

Roles: **A** = Admin, **T** = Technician, **C** = Customer, **P** = public (no login).

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | `/auth/login` | P | Log in |
| POST | `/auth/register` | A | Create a user (technician, customer login, admin) |
| GET | `/auth/me` | A T C | Current user (with customer company) |
| GET | `/users?role=` | A | List users |
| GET / PUT | `/users/:id` | A | Read / update (name, phone, active, password) |
| GET | `/customers` | A T | List customers |
| POST | `/customers` | A | Create |
| GET / PUT / DELETE | `/customers/:id` | A (GET: A T) | Read / update / delete (409 if machines exist) |
| GET | `/products?category=&type=&phase=` | P | Catalog |
| GET | `/products/:id` | P | Product with compatible parts |
| POST / PUT / DELETE | `/products`, `/products/:id` | A | Manage catalog |
| GET | `/machines?customerId=&category=` | A T C | Machines (customers: only theirs) with warranty/AMC status |
| POST | `/machines` | A | Register a machine (QR token and first due date set automatically) |
| GET / PUT / DELETE | `/machines/:id` | A (GET: all, scoped) | Read / update / delete (409 if it has jobs) |
| GET | `/machines/:id/history` | A T C | Full service timeline with parts and costs |
| GET | `/machines/:id/qr?download=1` | A T C | QR code PNG linking to the public page |
| GET | `/parts?lowStock=true&productId=` | A T | Parts with `isLowStock` flag |
| POST / PUT / DELETE | `/parts`, `/parts/:id` | A | Manage parts (PUT never changes stock) |
| POST | `/parts/:id/restock` | A | Add stock (logged as a stock movement) |
| GET | `/jobs?status=&type=&technicianId=&from=&to=` | A T C | Jobs (technician: own; customer: own machines) |
| POST | `/jobs` | A | Schedule a job |
| GET / PUT / DELETE | `/jobs/:id` | A (GET: scoped) | Read / edit / delete (not when closed) |
| PATCH | `/jobs/:id/status` | A T | Set OPEN / IN_PROGRESS, update notes |
| POST | `/jobs/:id/parts` | A T | Record a part used (`{ partId, quantity }`) |
| DELETE | `/jobs/:id/parts/:partUsedId` | A T | Remove a part entry |
| **POST** | **`/jobs/:id/close`** | A T | **Close: deduct stock in a transaction, block if short, move due date for ROUTINE, resolve request** |
| GET | `/requests?status=` | A C | Service requests (customer: own) |
| POST | `/requests` | A C | Raise a request for a machine |
| GET / PATCH | `/requests/:id` | A C | Read / change status (customer: cancel a NEW one) |
| POST | `/requests/:id/assign` | A | Assign technician: creates the job, request becomes ASSIGNED |
| GET | `/alerts/low-stock` | A T | Parts with stock ≤ minimum |
| GET | `/alerts/upcoming?serviceDays=15&coverDays=30` | A T | Service due, AMC and warranty ending soon |
| GET | `/notifications?unread=&type=` | A T C | Notifications (customer: own machines) |
| PATCH | `/notifications/:id/read` | A T C | Mark as read |
| POST | `/admin/run-reminders` | A | Run the daily reminder job now |
| GET | `/dashboard/summary` | A | Dashboard numbers, jobs per month, top alerts |
| POST | `/ml/product-selector` | P | Top 3 products with score and explanation |
| GET | `/ml/parts-forecast?months=12` | A | Next-month forecast and suggested reorder per part |
| GET | `/public/machines/:qrToken` | P | Machine summary for the QR page (no customer data) |
| POST | `/public/machines/:qrToken/requests` | P | Raise a request from the QR page |

## Quick try with curl

```bash
TOKEN=$(curl -s localhost:4000/api/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@demo.local","password":"Demo@12345"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')

curl -s localhost:4000/api/alerts/low-stock -H "Authorization: Bearer $TOKEN"
curl -s -X POST localhost:4000/api/ml/product-selector -H 'content-type: application/json' \
  -d '{"category":"AIR_COMPRESSOR","airflowCfm":60,"pressureBar":7.5,"phase":"THREE","application":"food"}'
```
