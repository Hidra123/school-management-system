# 🏫 ShuleHub — School Management System

Sistemu kamili ya usimamizi wa shule (Next.js 16 + Drizzle ORM + Neon PostgreSQL + Tailwind CSS 4).

> UI iko kwa Kiingereza, nyaraka zina maelezo ya Kiswahili.

---

## 🔑 Login

| Aina | Username | Password |
|------|----------|----------|
| Admin | `Admin` | `Rash@1234` |
| Member (mpya) | Check Number | `shulehub2025` |

Members **lazima** wabadilishe password mara ya kwanza wanapoingia (`mustChangePassword`).

---

## 🛠️ Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Drizzle ORM** + **PostgreSQL** (Neon free tier 512MB)
- **Tailwind CSS 4**
- Cookie-based auth, SHA-256 hashed passwords
- Deploy: **Vercel** (free, unlimited builds)

---

## 🚀 Quick Start (local / Codespace)

```bash
npm install

# weka connection string ya Neon
cp .env.example .env
# hariri .env -> DATABASE_URL="postgresql://...?sslmode=require"

npx drizzle-kit push        # tengeneza tables
npx -y tsx src/db/seed.ts   # tengeneza admin account pekee

npm run dev                 # http://localhost:3000
```

---

## 📁 Muundo wa Project

```
src/
├── app/
│   ├── layout.tsx              # Root layout + AuthProvider + AppShell
│   ├── globals.css             # Tailwind + animations (scaleIn, drawCheck)
│   ├── page.tsx                # Member dashboard
│   ├── login/                  # Login (Username + Password)
│   ├── admin/                  # Admin-only pages
│   │   ├── page.tsx            # Dashboard
│   │   ├── classes/            # Manage Classes (CRUD)
│   │   ├── subjects/           # Manage Subjects (CRUD + assign teacher)
│   │   ├── teachers/           # Manage Teachers (CRUD + auto user account)
│   │   └── assignments/        # Staff roles + permission presets
│   ├── students/ classes/ subjects/ teachers/
│   ├── attendance/ grades/ fees/
│   ├── profile/                # Change password (forced on first login)
│   └── api/                    # REST API routes
├── components/
│   ├── AuthProvider.tsx        # React context (user, username, mustChangePassword)
│   ├── AppShell.tsx            # Auth guard + sidebar (full width)
│   ├── Sidebar.tsx             # Admin sidebar vs Member sidebar
│   └── ui.tsx                  # Badge, Modal, Field, StatCard, Spinner, ActionButton...
├── lib/
│   ├── hash.ts                 # SHA-256 helpers (pure, no next/headers)
│   ├── auth.ts                 # Sessions + permission checks
│   ├── permissions.ts          # 38 permissions, role presets, sidebars
│   └── utils.ts                # fetch helpers, formatters
└── db/
    ├── index.ts                # Drizzle + pg pool (Neon SSL aware)
    ├── schema.ts               # Tables
    └── seed.ts                 # Admin account only
```

---

## 🗄️ Database Tables

`users`, `user_permissions`, `classes`, `teachers`, `subjects`, `students`,
`attendance`, `grades`, `fees`, `parents`, `staff_assignments`, `admissions`,
`audit_trail`, `activity_control`, `live_sessions`, `messages`, `timetable`,
`lesson_plans`, `log_book`, `teacher_on_duty`, `exams`, `system_settings`.

Muhimu: `teachers.userId → users.id` — kila teacher anayeongezwa **anapata user account moja kwa moja**.

---

## 🔐 Permissions

38 permissions katika makundi 14. Role presets:

| Role | Permissions |
|------|-------------|
| 🛡️ Admin | Zote |
| 📘 Academic Master | 31 |
| 🏫 Class Teacher | 17 |
| 👨‍🏫 Subject Teacher | 14 |
| 💰 Accountant / ⚽ Sports Manager / 🔬 Lab Technician / 📚 Librarian | Ndogo |

---

## 📦 Deployment

Soma [`QUICK-DEPLOY.md`](./QUICK-DEPLOY.md) (dakika 5) au [`DEPLOY.md`](./DEPLOY.md) (hatua kwa hatua).

---

## 📄 Nyaraka Zingine

- [`DEV.md`](./DEV.md) — maelezo ya development
- [`DEPLOY.md`](./DEPLOY.md) — GitHub + Vercel + Neon kwa undani
- [`QUICK-DEPLOY.md`](./QUICK-DEPLOY.md) — amri za haraka (copy-paste)
