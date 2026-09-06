# ShuleHub — Free Deployment Guide (GitHub + Netlify)

This project is a full-stack Next.js app (App Router) with a PostgreSQL database
(accessed through Drizzle ORM). To run it **for free on the internet** you need
three free services:

| Service | Role | Free plan |
|---|---|---|
| **GitHub** | Stores the code | Unlimited public/private repos |
| **Neon** (or Supabase) | Cloud PostgreSQL database | Free tier (enough for a school) |
| **Netlify** | Hosts & runs the app (server functions) | Free tier (100GB bandwidth/mo) |

> Why a cloud database? The app currently uses a local PostgreSQL inside this
> sandbox. Netlify cannot reach your computer or this sandbox, so the database
> must live on the internet too. Neon/Supabase give you a free one in minutes.

---

## Step 1 — Create a GitHub repository

1. Sign up / log in at https://github.com
2. Click **+ → New repository**
3. Name it `shulehub`, make it **Public** (free) or **Private** (also free)
4. Do **NOT** check “Add a README” (keep the repo empty)
5. Click **Create repository**

## Step 2 — Push this code to GitHub

Open a terminal on this machine (the project folder) and run:

```bash
git init
git add .
git commit -m "ShuleHub School Management System"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/shulehub.git
git push -u origin main
```

GitHub will ask for your username and a **Personal Access Token**
(Settings → Developer settings → Personal access tokens → Generate new token,
scope: `repo`). Paste the token instead of your password.

> `.env` is in `.gitignore`, so your local database password is never uploaded.
> All secrets will be set directly inside Netlify instead.

## Step 3 — Create a free cloud PostgreSQL database (Neon)

1. Go to https://neon.tech and sign up with GitHub (free)
2. Click **Create a project** → name it `shulehub` → region near you → create
3. Copy the **connection string**, e.g.
   `postgresql://neondb_owner:xxxx@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`
4. This string is your cloud `DATABASE_URL`. Keep it secret.

(Alternative: https://supabase.com → New project → Settings → Database →
Connection string → URI. It works the same way.)

## Step 4 — Create the tables and sample data in the cloud database

Still on this machine, run these two commands, replacing `CLOUD_DATABASE_URL`
with the string from Step 3:

```bash
DATABASE_URL="CLOUD_DATABASE_URL" npx drizzle-kit push
DATABASE_URL="CLOUD_DATABASE_URL" npx tsx src/db/seed.ts
```

- The first command creates all tables (classes, students, teachers, …).
- The second loads sample data so teachers can start using the system right away.
  Run it **once**. If you later want a clean database, just skip the seed step
  on a fresh push, or empty the tables from the Neon console.

## Step 5 — Deploy to Netlify

1. Go to https://app.netlify.com and sign up with **GitHub** (free)
2. Click **Add new site → Import an existing project**
3. Choose the `shulehub` repository
4. Netlify auto-detects Next.js. Keep the defaults:
   - Build command: `npm run build`
   - Publish directory: (leave as detected — Netlify handles `.next` itself)
5. Before deploying, click **Site settings → Environment variables →
   Add a variable** and add:
   - Key: `DATABASE_URL`
   - Value: the cloud connection string from Step 3
6. Click **Deploy site** and wait ~1–2 minutes

## Step 6 — Verify and share

1. Netlify gives you a free URL: `https://your-site-name.netlify.app`
2. Open it. You should see the Dashboard with the sample data.
3. Test: open **https://your-site-name.netlify.app/api/health** — it should
   return `{"ok":true}`.
4. Give teachers the link. Everyone can use it from any phone/computer.

## Step 7 — (Optional) Your own domain for free

1. Buy any cheap domain (e.g. from Namecheap) — or keep the free `netlify.app`
2. In Netlify: **Domain settings → Add a domain**
3. Follow Netlify’s DNS instructions (it gives you free SSL automatically)

---

## Updating the system later

After any code change, push to GitHub again — Netlify redeploys automatically:

```bash
git add .
git commit -m "description of change"
git push
```

## Common problems

| Problem | Fix |
|---|---|
| `DATABASE_URL is required` | Add the env var in Netlify and redeploy |
| Dashboard shows 0 everywhere | Run Step 4 again (push + seed) against the cloud URL |
| Build fails with network errors | Re-run the deploy; free tiers occasionally throttle |
| I want teachers to log in | Add an auth layer (e.g. NextAuth) — ask the developer |
