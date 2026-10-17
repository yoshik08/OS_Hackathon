# RaktaSetu backend — Express + MySQL

## Setup

1. **Database** — open `schema.sql` in MySQL Workbench and run it.
   Creates the `raktasetu` database: 9 tables + the `v_inventory` view.

2. **Seed data (demo)** — open `seed.sql` in Workbench and run it **once**.
   Loads demo accounts, donors, hospitals, 126 units of stock with staggered
   expiries, requests, donation history, camps, cross-match records and alerts.
   All dates are relative to today, so the demo always looks alive.

   Demo logins — password for all three is `password123`:
   - Donor: `ananya@example.com`
   - Hospital: `HSP-1024` (hospitals sign in with their Hospital ID)
   - Admin: `admin@raktasetu.in`

2. **Config** — copy `.env.example` to `.env` and fill in your MySQL
   password + a random `JWT_SECRET`:
   ```bash
   cp .env.example .env
   ```

3. **Install & run**
   ```bash
   npm install
   npm run dev    # or: npm start
   ```
   API listens on `http://localhost:5000`.

## What's inside

| Route base          | What it does |
|---------------------|--------------|
| `/api/auth`         | register, login (hospital logs in with Hospital ID), me |
| `/api/donors`       | profile, donation history, nearby requests (real haversine distance), match alerts |
| `/api/requests`     | list / mine / create / detail / donor matches / status updates |
| `/api/inventory`    | live stock summary (public — the landing page uses it), batch detail + restock (admin) |
| `/api/donations`    | record a donation → creates an expiry-aware stock batch + updates the donor |
| `/api/camps`        | list (public), create / update (admin) |
| `/api/crossmatch`   | records (admin) |
| `/api/alerts`       | active alerts, raise, resolve (admin) |
| `/api/admin`        | dashboard stats, reports, demand forecast — all computed from real data |
| `/api/meta`         | blood group list (public) |

Key behaviours:
- **Expiry-aware dispatch** — marking a request `Fulfilled` consumes the
  oldest-expiring batches first (FIFO by expiry), in a transaction.
- **Recording a donation** creates a 42-day stock batch and updates the
  donor's `last_donation_date` / `total_donations` atomically.
- **Critical requests** auto-raise an admin alert.
- Auth is JWT (`Authorization: Bearer <token>`); passwords are bcrypt-hashed.
