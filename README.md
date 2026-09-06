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

Push the database schema and seed sample data:
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
