# 🗂️ ShuleHub — Project Structure (LIVE CHART)

> **💡 MATUMIZI YA CHART HII:** Hii ni ramani kamili ya mfumo + taarifa za kufikia (access).
> Session yoyote mpya inapofunguliwa, **paste hii** kwenye chat na AI itaweza:
> 1. Kuona muundo kamili wa files (103 files ziko `src/`)
> 2. Kuingia kwenye **GitHub** (repo hapa chini) na **Neon** (database hapa chini)
> 3. Kufanya marekebisho/mabadiliko **moja kwa moja** — mteja kazi yake ni kuona deploy tuu

---

## 🔑 ACCESS INFO — KWA SESSION IJAYO / AI (ya muhimu zaidi)

**GitHub repo (main):**
```
https://github.com/Hidra123/school-management-system
git clone --depth 1 https://github.com/Hidra123/school-management-system /tmp/shulehub
```
- Push moja kwa moja kupitia API: `PUT https://api.github.com/repos/Hidra123/school-management-system/contents/<path>`
- Inahitaji **fine-grained token** (repo moja tu: `school-management-system`, permission: **Contents: Read and write**)
- ⚠️ Mteja hutoa token kwenye chat inapohitajika — **USIIWEKE kwenye file yoyote ya repo** (usalama!)

**Neon PostgreSQL (database halisi):**
```
postgresql://neondb_owner:npg_q6pNKkW2jBQi@ep-winter-water-ayvokh3c-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require
```
- Console: `console.neon.tech` → SQL Editor (mabadiliko ya schema ya mkono — hakuna terminal pale)
- Sandbox: set `DATABASE_URL` kwa hii URL ili kupima API dhidi ya data halisi
- Test: `psql "$NEON" -c "SELECT count(*) FROM users;"`
- ⚠️ Baada ya kubadilisha `src/db/schema.ts` → **andika SQL equivalent na ui-run kwenye Neon** (unaweza kufanya moja kwa moja kwa `psql` kutoka sandbox)

**Vercel:** `shulehub-sms` — auto-deploy kwenye kila commit ya `main`.
- Check: `vercel.com` → shulehub-sms → Deployments → green dot = **Ready** (dakika 2-4)

**Login (kwa majaribio):**
- Admin: Username `Admin` / Password `Rash@1234`
- Members: Check Number (username) — temp password `shulehub2025` (inabadilishwa kwa lazima mara ya kwanza)
- Academic Master: username `113635655` (Hidra Ramadhani Omari) — `staff_role='academic_master'` imewekwa Neon ✓

**Kanuni za kufanya kazi:**
- ✅ Endeleza ndani ya sandbox, thibitisha (`next typegen` → `tsc --noEmit` → `npm run build` → `build_and_start`), kisha **push via GitHub API mwenyewe** — mteja hapuasti chochote
- ✅ Kila API route mpya: `try/catch` + `dbErrorResponse()` kutoka `@/lib/apiError`
- ✅ Scoping ya member: `getTeacherScope(user, { strictForAcademicMaster? })` kutoka `@/lib/teachers`
- ✅ Exam Type: **SE | CA tuu** — daima kutoka `@/lib/examTypes`
- ✅ `students.admissionNo`: KAMWE usiweke `.unique()` peke yake — inabaki composite `(class_id, admission_no)`
- ✅ `xlsx`: daima SheetJS CDN URL (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`) — kamwe npm plain
- ✅ `list ?? []` kama dependency ya useEffect/useMemo → lazima `useMemo` (hatari ya infinite loop)

**⚡ MWANZO WA SESSION (run kwenye sandbox):**
```bash
bash scripts/session-check.sh
```
Ina-test Neon + ina-clone GitHub + ina-diff files zote dhidi ya sandbox — utajua mara moja kama kuna chochote kilicho out of sync.

---

## 📌 Hali ya CURRENT (session zilizopita zimefanya hivi)

✅ **Exam Type — SE | CA tuu** (2 choices): Examination panel + Submit Scores + API validation (400 kwa nyingine) + enum ya Neon ina SE/CA + legacy data imefolded
✅ **Academic Master scoping**: Students = classes ZOTE (ana-admit popote) · Submit Scores = assigned TU (strict) + guards za mwisho
✅ **Neon imewekwa moja kwa moja**: `staff_role='academic_master'` (113635655), `grades.exam_type` default `'SE'`

---

## 🗂️ CHART KAMILI YA MUUNDO

> **LEGEND:** ✅ = inafanya kazi · 🚧 = stub (roadmap) · 🔧 = imeboreshwa · ⚠️ = pengo linalojulikana

```
shulehub-sms/
├── .env / package.json / drizzle.config.ts / vercel.json / next.config.ts
├── README.md / DEPLOY.md / DEV.md / QUICK-DEPLOY.md
├── PROJECT-STRUCTURE.md          # ← CHART HII (update kila session)
├── scripts/session-check.sh      # ⚡ Neon + GitHub sync checker
│
└── src/
    ├── app/                      # ═══════ PAGES (App Router) ═══════
    │   ├── layout.tsx · globals.css
    │   ├── page.tsx              # ✅ Member Dashboard (scoped /api/stats)
    │   ├── login/page.tsx + layout.tsx  # ✅ Login moja — Staff/Admin tab (Check Number)
    │   ├── profile/page.tsx      # ✅ Change Password (forced first login)
    │   │
    │   │   ──────── 👑 ADMIN ONLY ────────
    │   │
    │   ├── admin/
    │   │   ├── page.tsx                  # ✅ Admin Dashboard
    │   │   ├── classes/page.tsx          # ✅ CRUD
    │   │   ├── subjects/page.tsx         # ✅ CRUD (teacher asgn → Manage Teachers)
    │   │   ├── teachers/page.tsx         # ✅ CRUD + auto login + Assign Subjects & Classes
    │   │   ├── assignments/page.tsx      # ✅ Add Staff Member (roles zote + permissions)
    │   │   ├── profile/page.tsx          # ✅ Admin profile + change password
    │   │   ├── admissions/page.tsx       # 🚧 STUB
    │   │   ├── monitor/page.tsx          # 🚧 STUB
    │   │   ├── parents/page.tsx          # 🚧 STUB
    │   │   ├── parent-assignments/page.tsx # 🚧 STUB
    │   │   ├── activity/page.tsx         # 🚧 STUB
    │   │   ├── sessions/page.tsx         # 🚧 STUB
    │   │   ├── audit/page.tsx            # 🚧 STUB
    │   │   └── settings/page.tsx         # 🚧 STUB
    │   │
    │   │   ──────── 👨‍🏫 MEMBER (Teacher/Staff) ────────
    │   │
    │   ├── students/page.tsx            # ✅ CRUD + Excel Import (scoped, admissionNo per-class)
    │   ├── teachers/page.tsx            # ✅ read view
    │   ├── classes/page.tsx             # ✅ read view (scoped, banner)
    │   ├── subjects/page.tsx            # ✅ read view (scoped, banner)
    │   ├── attendance/page.tsx          # ✅ Daily (4 tabs: Daily/Monthly/Report/DaysSaved, AM+PM)
    │   ├── attendance-tracking/page.tsx # ✅ School-wide (Admin + Academic Master, 5 tabs)
    │   ├── exams/page.tsx               # 🔧 SE|CA — Manage Examinations + Routine & Results tabs
    │   ├── grades/
    │   │   ├── page.tsx                 # 🔧 Submit Scores — step-by-step (Class → Subject → Exam Category SE/CA → Exam Name ACTIVE) then students
    │   │   ├── tracking/page.tsx        # ✅ Score Tracking — stat cards + filters (Class/Exam Type/Category/Year) + 3 tabs (Submission Progress, Detailed Score View, By Teacher) + Print
    │   │   └── report/page.tsx          # 🚧 STUB
    │   ├── fees/page.tsx                # ✅ ⚠️ bado haijascope kwa teachers
    │   ├── timetable/page.tsx           # 🚧 STUB
    │   ├── lesson-plans/page.tsx        # 🚧 STUB
    │   ├── logbook/page.tsx             # 🚧 STUB
    │   ├── tod/page.tsx                 # 🚧 STUB
    │   ├── messages/page.tsx            # 🚧 STUB
    │   ├── assignments/page.tsx         # 🚧 STUB (member-facing "My Class")
    │   │
    │   └── api/                    # ═══════ API ROUTES ═══════
    │       ├── health/route.ts · stats/route.ts    # ✅
    │       ├── auth/ login · logout · me · change-password   # ✅
    │       ├── admin/members/ + [id]/              # ✅
    │       ├── students/ + [id]/ + bulk-import/    # 🔧 (GET inapokea ?strict=1)
    │       ├── teachers/ + [id]/ + [id]/assignments/  # ✅
    │       ├── classes/ + [id]/                    # 🔧 (?strict=1)
    │       ├── subjects/ + [id]/                   # 🔧 (?strict=1 + guard)
    │       ├── attendance/ · monthly/ · report/ · days-saved/
    │       │   · school-overview/ · daily-summary/ · at-risk/ · annual-overview/  # ✅ (8 routes)
    │       ├── exams/ · [id]/ · active/ · remarks/ · results/
    │       │   · results/student/ · settings/      # 🔧 (SE|CA validation)
    │       ├── grades/ + [id]/                     # 🔧 (strict scope)
    │       └── fees/ + [id]/                       # ✅ ⚠️ haijascope
    │
    ├── components/
    │   ├── ui.tsx · AuthProvider · AppShell · Sidebar · ChangePasswordForm
    │   ├── AssignSubjectsClassesModal · ImportStudentsModal
    │   ├── attendance/ (DailyEntry · MonthlyRegister · AttendanceReport · DaysSaved)
    │   ├── attendance-tracking/ (SchoolOverview · DailySummary · AtRisk)
    │   └── exams/ (ManageExaminations 🔧 · ExamRoutineResults · ClassResultReport · StudentReportCard)
    │
    ├── db/  index.ts · schema.ts 🔧 · seed.ts
    │
    └── lib/ auth.ts · permissions.ts · teachers.ts 🔧 · examTypes.ts 🔧
        · examGrading.ts · attendanceHelpers.ts · apiError.ts · utils.ts
```

---

## 📌 KUMBUKUMBU ZA KIJENZI (hatua zinazofuata)

**PRIORITY YA JUU:**
1. ⚠️ **Fees — scoping kwa teachers** (`/api/fees` bado haitumii `getTeacherScope`)
2. 🚧 **Timetable** — kubuni schedule ya masomo (Form 1-4)
3. 🚧 **Exams Routine & Results** — kukamilisha routine publisher

**PRIORITY YA KATI:**
4. 🚧 Admissions (Approve/Reject) — Admin
5. 🚧 Monitor dashboards (school-wide performance)
6. 🚧 Manage Parents + Parent Assignments
7. 🚧 Messages (staff messaging)
8. 🚧 Assignments (member-facing "My Class")
9. 🚧 Lesson Plans / Logbook / T.O.D.

**PRIORITY YA CHINI:**
10. 🚧 Grades tracking + Submission Report
11. 🚧 Activity Control / Live Sessions
12. 🚧 Audit Trail + System Settings

**KANUNI (zisizobadilika):**
- ✅ API route zote: `try/catch` + `dbErrorResponse()`
- ✅ Scoping: `getTeacherScope` kwa kila route ya member
- ✅ Exam Type: SE|CA tuu kutoka `@/lib/examTypes`
- ✅ `admissionNo`: composite `(class_id, admission_no)` — kamwe global unique
- ✅ `xlsx`: SheetJS CDN URL pekee
- ✅ Schema inabadilika → SQL ya mkono kwa Neon (IF NOT EXISTS guards)
