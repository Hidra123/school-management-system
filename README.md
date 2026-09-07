# 🎓 ShuleHub — School Management System

A complete, modern school management system built with **Next.js**, **PostgreSQL**, **Drizzle ORM** and **Tailwind CSS**.

## Features

- 📊 **Dashboard** — School overview with stats, attendance, fees and recent students
- 👨‍🎓 **Students** — Full CRUD with search, class filtering, guardian info
- 👨‍🏫 **Teachers** — Manage teachers, qualifications, contact details
- 🏫 **Classes** — Class cards with capacity tracking
- 📚 **Subjects** — Subject management with teacher assignment
- ✅ **Attendance** — Mark daily attendance per class (present/absent/late/excused)
- 📝 **Grades** — Bulk grade entry by class, exam type filtering
- 💰 **Fees** — Fee management with payment tracking, overdue alerts

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4
- **Backend:** Next.js API Routes, Drizzle ORM
- **Database:** PostgreSQL
- **Language:** TypeScript

## Getting Started

```bash
npm install
```

Set up your `.env` file:
```
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

Push the database schema and create the Admin account (no sample data):
```bash
npx drizzle-kit push
npx tsx src/db/seed.ts
```

Start the development server:
```bash
npm run dev
```

## Deployment

See [DEPLOY.md](./DEPLOY.md) for a step-by-step free deployment guide using GitHub + Neon + Netlify.

## 🔐 Authentication

| Who | Login tab | Identifier | Password |
|-----|-----------|------------|----------|
| Admin | 🛡️ Admin Login | Username `Admin` | `Rash@1234` |
| Staff / Teachers | 👨‍🏫 Staff Login | Check Number (set by admin) | `shulehub2025` (default) |

- One login form serves both roles — the tab only changes the label.
- **Adding a teacher** (Admin → Manage Teachers) automatically creates a login account
  (`teachers.user_id` → `users.id`) with the default password and the *Subject Teacher* permissions.
- Teacher cards show the Check Number and password (eye icon to reveal) plus **Reset Password**.
- Members **must change the default password on first login** (`must_change_password`).
  Until they do, every page redirects to `/profile`.
- `npx tsx src/db/seed.ts` only creates/repairs the Admin account. Use `--reset` to wipe all data.
