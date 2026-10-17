# Deploying RaktaSetu — Railway (backend + MySQL) + Vercel (frontend)

Stack: frontend on Vercel (free) → backend on Railway → MySQL on Railway.
Railway gives a **$5 one-time trial credit** — plenty for an expo. Delete the
Railway project afterwards if you don't want to pay.

Do the steps **in order**: GitHub → Railway DB → seed → Railway backend →
Vercel frontend → CORS var.

## 0. Push the backend to GitHub

Your repo `Kairav09/DBSE-Project` currently has `doc/` and `frontend/`.
Add the backend next to them:

```bash
git clone https://github.com/Kairav09/DBSE-Project.git raktasetu-deploy
cp -r /path/to/unzipped/backend raktasetu-deploy/backend
cd raktasetu-deploy
git add backend
git commit -m "Add Express + MySQL backend"
git push
```

Never commit `backend/.env` (it's gitignored in the zip already — double-check).

## 1. Railway — MySQL

1. Sign up at railway.app with GitHub.
2. **New Project → New → Database → Add MySQL.**
3. Click the MySQL service → **Settings → Networking → Generate Domain**
   (public). Note the public host/port — you'll need them for Workbench.
4. Go to the **Variables** tab and copy `MYSQL_URL`
   (looks like `mysql://root:xxxx@containers-xxx.railway.app:6xxx/railway`).

## 2. Seed the hosted database

1. Open MySQL Workbench → new connection using the Railway public host,
   port, user `root`, and the password from `MYSQL_URL`.
2. Run `backend/schema.sql` (creates the `raktasetu` database + 9 tables).
3. Run `backend/seed.sql` (demo data).

## 3. Railway — backend API

1. In the same project: **New → GitHub Repo → DBSE-Project**.
2. Click the new service → **Settings → Source → Root Directory** = `backend`.
3. **Variables** tab → add:
   - `DATABASE_URL` = `${{MySQL.MYSQL_URL}}` but change the trailing
     `/railway` to `/raktasetu`
     (e.g. `mysql://root:xxxx@containers-xxx.railway.app:6xxx/raktasetu`).
     Tip: inside one Railway project you can also use the private host —
     either works.
   - `JWT_SECRET` = any long random string.
   - `FRONTEND_URL` = leave blank for now (step 5).
4. **Settings → Networking → Generate Domain** → you get
   `https://<name>.up.railway.app`.
5. Railway auto-deploys. Check the deploy logs say `✓ Connected to MySQL`,
   then open `https://<name>.up.railway.app/api/health` — expect `{"ok":true}`.

## 4. Vercel — frontend

1. Sign up at vercel.com with GitHub → **Add New → Project** → import
   `DBSE-Project`.
2. **Root Directory** = `frontend` (framework preset: Vite).
3. **Environment Variables**: `VITE_API_URL` = `https://<name>.up.railway.app`
   (your Railway backend domain — no trailing slash).
   This is baked in at build time, so set it *before* deploying.
4. Deploy → you get `https://<your-app>.vercel.app`.

## 5. Allow the frontend through CORS

1. Back on Railway → backend service → **Variables** → set
   `FRONTEND_URL` = `https://<your-app>.vercel.app` → redeploys automatically.
2. Open the Vercel link and sign in:
   - Donor: `ananya@example.com` / `password123`
   - Hospital: `HSP-1024` / `password123`
   - Admin: `admin@raktasetu.in` / `password123`

## Troubleshooting

- **"Cannot reach MySQL" in Railway logs** → `DATABASE_URL` is wrong or the
  database name isn't `/raktasetu`.
- **Frontend loads but API calls fail** → `VITE_API_URL` wrong, or
  `FRONTEND_URL` missing on the backend (CORS).
- **Workbench can't connect to Railway MySQL** → public domain not generated
  (step 1.3), or wrong port.
