# Demo script (about 10 minutes)

Shows the full flow: **customer raises a request → admin assigns a technician → technician closes the job
with parts → stock drops → low-stock alert → reminder email**, then the two smart features.

## Before you start

1. Start everything: `docker compose up --build` (or the three local commands in the README).
2. Reset the demo data so the numbers below match:
   - Docker: `docker compose exec backend node prisma/seed.js`
   - Local: `cd backend && npm run seed`
3. Open two browser windows: a normal one (admin) and a private one (customer, then technician).
   For the technician, use the browser's phone view (F12 → device toolbar) to show the mobile layout.
4. Keep the backend logs visible (`docker compose logs -f backend`, or the `npm run dev` terminal):
   that is where emails appear in development.

All demo passwords are the `SEED_PASSWORD` from `.env` (default `Demo@12345`).

| Who | Login |
|---|---|
| Admin / owner | admin@demo.local |
| Technician | ravi@demo.local |
| Customer (Precision Plastics Moulding) | precision@demo.local |

App URL: http://localhost:8080 with Docker, http://localhost:5173 when running locally.

---

## 1. Customer raises a service request (private window)

1. Log in as **precision@demo.local**. Point out *My machines*: each card shows AMC and warranty status and
   the next service date. One machine's warranty is *Expiring soon*.
2. Open machine **AC-S11-024098** to show its service history timeline (jobs, parts, cost).
3. Click **Request service**, type *"Compressor running hot and tripping after lunch"* and send.
4. Open **My requests**: the request is *New*.

> Also show: the **QR code** on the machine page. Scanning it (or clicking *Open public page*) opens a page
> anyone on site can use without logging in, with its own *Request service* button.

## 2. Admin assigns a technician (admin window)

1. Log in as **admin@demo.local**. Walk through the dashboard: open jobs, new requests, services due this
   week (the overdue ones are in red), low-stock parts, AMC ending soon, and the jobs-per-month chart.
2. Note the **Low-stock parts** count (it depends on the date, because the history always ends today) and
   that **Oil separator EG 11 (SEP-S11)** is *not* in the list yet (5 in stock, minimum 2).
3. Go to **Service requests** → the new request → **Assign** → technician **Ravi Kumar**, today's date,
   type *Breakdown* → **Create job & assign**. The request moves to *Assigned*.

## 3. Technician closes the job with parts (private window, phone view)

1. Sign out, log in as **ravi@demo.local**. *My jobs* lists the new job at Precision Plastics, scheduled today (below the job already in progress).
2. Open it → **Start job** (status becomes *In progress*).
3. **+ Add part** → the list only shows parts that fit an ELGi EG 11 → choose **Oil separator EG 11 (SEP-S11)**,
   quantity **3** → **Add**.
4. *(Optional, to show the safety check)* change the quantity to **9** and try to close: the API refuses with
   "need 9, only 5 in stock" and nothing changes. Set it back to 3.
5. Write a note, then **Close job** → confirm. The green box says the job is closed, stock was updated, and
   **SEP-S11 is now low (2 left)**.

## 4. Stock drops and the low-stock alert appears (admin window)

1. Refresh the dashboard: **Low-stock parts** is one higher (the dashboard card lists the emptiest parts
   first, so the separator may be further down the full list).
2. **Parts inventory** → tick *Show low stock only*: SEP-S11 shows 2 / min 2 in red.
3. If asked how stock changes are tracked: every change is a stock movement (opening stock, each job, each
   restock). `GET /api/parts/:id` in Swagger shows the last 20 movements for a part.
4. **Restock** SEP-S11 with 10 units (note "PO-1043") to show the restock entry.
5. Open **Machines → AC-S11-024098**: the timeline now starts with today's job and the 3 separators.
6. Customer side: **My requests** now shows the request as *Resolved* (closing the job resolved it).

## 5. Reminder emails

1. On the dashboard click **Run reminders now** (the same code node-cron runs every day at 07:00).
2. The green banner shows how many reminders were created (service due within 15 days, AMC and warranty
   ending within 30 days) and how many emails were sent.
3. Show the backend log: each email is printed with recipient, subject and text, e.g.
   *"Reminder: Routine service is due in 3 day(s)"*.
4. Click **Run reminders now** again: **0 new**, all *already notified*. Explain the unique index that
   prevents duplicate reminders.

## 6. Smart features

1. **Product selector** (left menu, or `/selector`, which needs no login): *Air compressor*, 60 CFM,
   7.5 bar, three-phase, application *Food*. The **ELGi AB 15** oil-free screw scores 100/100. Point at the score bars and
   the explanation. Then change the power supply to *Single-phase* to show the three-phase machines
   dropping down with a "does not meet a must-have" badge.
2. **Parts demand forecast** (bottom of the admin dashboard): the parts that need ordering, each with the
   last 6 months of use, next month's forecast, which method was chosen (the one with the lowest past error
   over 24 months) and the suggested reorder quantity. Tick *Show all parts* for the whole catalog. Filters
   and oils for the most common screw compressors are the fast movers; point out the growth trend.
   [DATA.md](DATA.md) explains where the catalog specs and the five-year history come from.

## 7. If you are asked "how do you know it works?"

- `cd backend && npm test`: 75 tests (auth and roles, CRUD, job-close transaction and rollback, due dates,
  reminders without duplicates, machine history, ML proxy, seed stock adds up).
- `cd ml-service && pytest`: 17 tests for the selector and the forecast.
- The same backend test suite also passes against PostgreSQL.
