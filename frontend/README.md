# Frontend (React + Vite + Tailwind)

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173 (the backend must be running on :4000)
npm run build    # production build in dist/
```

## Pages

| URL | Who | What |
|---|---|---|
| `/login` | everyone | One login for all roles; redirects to the right home page |
| `/admin` | Admin | Dashboard: open jobs, services due, low stock, AMC expiring, jobs chart |
| `/admin/requests` | Admin | Customer requests; assign a technician (creates a job) |
| `/admin/jobs` | Admin | All jobs with filters; schedule / reassign |
| `/admin/machines`, `/admin/machines/:id` | Admin | Machine list; detail with service timeline and downloadable QR |
| `/admin/parts` | Admin | Inventory with low-stock highlighting and restock entry |
| `/admin/customers` | Admin | Customers; optionally create their portal login |
| `/tech`, `/tech/jobs/:id` | Technician | Mobile-first: my jobs, start, add parts, notes, close |
| `/portal`, `/portal/machines/:id`, `/portal/requests` | Customer | My machines, AMC status, history, raise and track requests |
| `/m/:token` | public | QR landing page: model, warranty/AMC status, "Request service" |

`/m/:token` and `/login` use no admin layout, so the company website can link to them
directly (for example from `service.company.com`).

## Code layout

```
src/
  api/client.js        axios instance: adds the JWT, turns API errors into readable messages
  auth/                login state (AuthContext) and role-protected routes
  hooks/useApi.js      load data with loading / error / reload
  components/ui.jsx    Button, Card, Table, Modal, Badge, form fields, loaders, empty states
  layouts/AppLayout    sidebar on desktop, top bar + menu on phones
  pages/               one file per screen, grouped by role
```
