# 🗂️ ShuleHub — Project Structure (LIVE CHART)

> **Jinsi ya kutumia:** Chart hii inaonyesha muundo kamili wa mfumo na hali ya kila moduli.
> Kila session mpya inapobadilika, tunaupdate chart hii — paste/commit na uendelee.
>
> **LEGEND:**
> - ✅ = Inafanya kazi kikamilifu
> - 🚧 = Stub (roadmap — haijajengwa bado)
> - 🔧 = Imeboreshwa/imewekwa session ya hivi karibuni
> - ⚠️ = Inafanya kazi lakini kuna pengo inayojulikana

```
shulehub-sms/
│
├── .env                            # DATABASE_URL (Neon), SESSION_SECRET
├── package.json                    # next 16, drizzle-orm, xlsx@SheetJS CDN
├── drizzle.config.ts               # Drizzle config → Neon
├── vercel.json / next.config.ts    # Vercel deploy config
├── README.md / DEPLOY.md / DEV.md / QUICK-DEPLOY.md
├── PROJECT-STRUCTURE.md            # ← CHART HII (update kila session)
│
└── src/
    │
    ├── app/                        # ═══════ PAGES (App Router) ═══════
    │   ├── layout.tsx              # Root layout
    │   ├── globals.css             # Tailwind 4 + custom styles
    │   ├── page.tsx                # ✅ Member Dashboard (scoped /api/stats)
    │   │
    │   ├── login/
    │   │   └── page.tsx + layout.tsx   # ✅ Login moja — Staff/Admin tab toggle (Check Number)
    │   ├── profile/page.tsx        # ✅ Change Password (forced first login)
    │   │
    │   │   ──────── 👑 ADMIN ONLY ────────
    │   │
    │   ├── admin/
    │   │   ├── page.tsx            # ✅ Admin Dashboard
    │   │   ├── classes/page.tsx    # ✅ Manage Classes (CRUD)
    │   │   ├── subjects/page.tsx   # ✅ Manage Subjects (CRUD — teacher assignment kupitia Manage Teachers)
    │   │   ├── teachers/page.tsx   # ✅ Manage Teachers (CRUD + auto login + Assign Subjects & Classes)
    │   │   ├── assignments/page.tsx# ✅ Add Staff Member (roles zote + permission editor)
    │   │   ├── profile/page.tsx    # ✅ Admin profile + change password
    │   │   ├── admissions/page.tsx         # 🚧 STUB
    │   │   ├── monitor/page.tsx            # 🚧 STUB
    │   │   ├── parents/page.tsx            # 🚧 STUB
    │   │   ├── parent-assignments/page.tsx # 🚧 STUB
    │   │   ├── activity/page.tsx           # 🚧 STUB
    │   │   ├── sessions/page.tsx           # 🚧 STUB
    │   │   ├── audit/page.tsx              # 🚧 STUB
    │   │   └── settings/page.tsx           # 🚧 STUB
    │   │
    │   │   ──────── 👨‍🏫 MEMBER (Teacher/Staff) ────────
    │   │
    │   ├── students/page.tsx       # ✅ Students CRUD + Excel Import (scoped)
    │   ├── teachers/page.tsx       # ✅ Teachers read view
    │   ├── classes/page.tsx        # ✅ Classes read view (scoped, banner)
    │   ├── subjects/page.tsx       # ✅ Subjects read view (scoped, banner)
    │   │
    │   ├── attendance/page.tsx     # ✅ Daily Attendance (4 tabs: Daily/Monthly/Report/DaysSaved, AM+PM)
    │   ├── attendance-tracking/page.tsx    # ✅ School-wide (Admin + Academic Master, 5 tabs)
    │   │
    │   ├── exams/page.tsx          # 🔧 Examinations — Exam Type: SE | CA TU (2 choices)
    │   │                            #   • Manage Examinations tab
    │   │                            #   • Exam Routine & Results tab
    │   │                            #   • ClassResultReport + StudentReportCard components
    │   │
    │   ├── grades/
    │   │   ├── page.tsx            # 🔧 Submit Scores (scoped — Academic Master strict kwa assigned tu)
    │   │   ├── tracking/page.tsx   # 🚧 STUB
    │   │   └── report/page.tsx     # 🚧 STUB
    │   │
    │   ├── fees/page.tsx           # ✅ Fees management ⚠️ bado haijascope kwa teachers
    │   │
    │   ├── timetable/page.tsx      # 🚧 STUB
    │   ├── lesson-plans/page.tsx   # 🚧 STUB
    │   ├── logbook/page.tsx        # 🚧 STUB
    │   ├── tod/page.tsx            # 🚧 STUB
    │   ├── messages/page.tsx       # 🚧 STUB
    │   ├── assignments/page.tsx    # 🚧 STUB (member-facing "My Class" — si admin/assignments)
    │   │
    │   └── api/                    # ═══════ API ROUTES ═══════
    │       ├── health/route.ts     # ✅ GET /api/health
    │       ├── stats/route.ts      # ✅ GET /api/stats (scoped dashboard)
    │       │
    │       ├── auth/
    │       │   ├── login/route.ts          # ✅ POST /api/auth/login
    │       │   ├── logout/route.ts         # ✅ POST /api/auth/logout
    │       │   ├── me/route.ts             # ✅ GET /api/auth/me
    │       │   └── change-password/route.ts# ✅ PUT /api/auth/change-password
    │       │
    │       ├── admin/members/
    │       │   ├── route.ts                # ✅ GET, POST /api/admin/members
    │       │   └── [id]/route.ts           # ✅ GET, PUT, DELETE /api/admin/members/:id
    │       │
    │       ├── students/
    │       │   ├── route.ts         # ✅ GET, POST (scoped, admissionNo per-class)
    │       │   ├── [id]/route.ts    # ✅ GET, PUT, DELETE
    │       │   └── bulk-import/route.ts    # ✅ POST (Excel/CSV, header aliasing)
    │       │
    │       ├── teachers/
    │       │   ├── route.ts         # ✅ GET, POST
    │       │   ├── [id]/route.ts    # ✅ GET, PUT, DELETE
    │       │   └── [id]/assignments/route.ts # ✅ GET, PUT
    │       │
    │       ├── classes/
    │       │   ├── route.ts         # 🔧 GET (inapokea ?strict=1), POST
    │       │   └── [id]/route.ts    # ✅ GET, PUT, DELETE
    │       │
    │       ├── subjects/
    │       │   ├── route.ts         # 🔧 GET (inapokea ?strict=1), POST
    │       │   └── [id]/route.ts    # ✅ GET, PUT, DELETE
    │       │
    │       ├── attendance/
    │       │   ├── route.ts         # ✅ GET, POST (scoped, AM/PM)
    │       │   ├── monthly/route.ts         # ✅ GET
    │       │   ├── report/route.ts          # ✅ GET
    │       │   ├── days-saved/route.ts      # ✅ GET
    │       │   ├── school-overview/route.ts # ✅ GET (admin + academic_master)
    │       │   ├── daily-summary/route.ts   # ✅ GET
    │       │   ├── at-risk/route.ts         # ✅ GET
    │       │   └── annual-overview/route.ts # ✅ GET
    │       │
    │       ├── exams/
    │       │   ├── route.ts         # 🔧 GET, POST (Exam Type: SE|CA tu)
    │       │   ├── [id]/route.ts    # 🔧 GET, PUT (SE|CA tu), DELETE
    │       │   ├── active/route.ts  # ✅ GET (exams zinazoonekana kwa teachers)
    │       │   ├── remarks/route.ts # ✅ GET/POST (student remarks)
    │       │   ├── results/route.ts # ✅ GET (class results: divisions, GPA, ranking)
    │       │   ├── results/student/route.ts # ✅ GET (student report card)
    │       │   └── settings/route.ts # ✅ GET/PUT (submission window)
    │       │
    │       ├── grades/
    │       │   ├── route.ts         # 🔧 GET, POST (strict scope kwa Academic Master)
    │       │   └── [id]/route.ts    # 🔧 GET/PUT/DELETE (strict scope)
    │       │
    │       └── fees/
    │           ├── route.ts         # ✅ GET, POST ⚠️ bado haijascope
    │           └── [id]/route.ts    # ✅ GET, PUT, DELETE
    │
    ├── components/                 # ═══════ REUSABLE COMPONENTS ═══════
    │   ├── ui.tsx                  # Badge, Modal, Field, StatCard, Spinner, ActionButton, useActionState...
    │   ├── AuthProvider.tsx        # user{id,name,username,role,permissions[],staffRole}
    │   ├── AppShell.tsx            # Auth guard + redirects + forced password lock
    │   ├── Sidebar.tsx             # Admin vs Member (permission-filtered)
    │   ├── ChangePasswordForm.tsx
    │   ├── AssignSubjectsClassesModal.tsx  # Teacher → Subjects/Classes matrix
    │   ├── ImportStudentsModal.tsx # Excel/CSV upload + preview + validation
    │   │
    │   ├── attendance/             # DailyEntryTab, MonthlyRegisterTab,
    │   │                           # AttendanceReportTab, DaysSavedTab
    │   ├── attendance-tracking/    # SchoolOverviewTab, DailySummaryTab,
    │   │                           # AtRiskStudentsTab
    │   └── exams/                  # ManageExaminationsTab 🔧 (SE|CA),
    │                               # ExamRoutineResultsTab, ClassResultReport,
    │                               # StudentReportCard
    │
    ├── db/
    │   ├── index.ts                # Drizzle client → Neon
    │   ├── schema.ts               # 🔧 Tables zote + enum exam_type (SE|CA + legacy)
    │   └── seed.ts                 # Creates/repairs Admin (--reset)
    │
    └── lib/
        ├── auth.ts                 # login, session, getSessionUser, requireAuth/Permission
        ├── permissions.ts          # 39 permissions, ROLE_PRESETS (academic_master/class_teacher/teacher)
        ├── teachers.ts             # 🔧 getTeacherScope(user, {strictForAcademicMaster})
        ├── examTypes.ts            # 🔧 MPYA — EXAM_TYPES [SE, CA] + helpers (single source of truth)
        ├── examGrading.ts          # Score → grade/points/division (Tanzania grading)
        ├── attendanceHelpers.ts    # Attendance calculation helpers
        ├── apiError.ts             # dbErrorResponse(e, action)
        └── utils.ts                # useFetch, postJSON, putJSON, delJSON, shortDate, cls
```

---

## 📌 KUMBUKUMBU ZA KIJENZI (hatua zinazofuata)

**PRIORITY YA JUU (inayojulikana):**
1. ⚠️ **Fees — scoping kwa teachers** (`/api/fees` bado haitumii `getTeacherScope`)
2. 🚧 **Examinations — Exam Routine & Results**: kukamilisha routine publisher + score entry ya results ya class
3. 🚧 **Timetable** — kubuni schedule ya masomo (Form 1-4)

**PRIORITY YA KATI:**
4. 🚧 Admissions (Approve/Reject) — Admin
5. 🚧 Monitor dashboards (school-wide performance)
6. 🚧 Manage Parents + Parent Assignments
7. 🚧 Messages (staff messaging)
8. 🚧 Assignments (member-facing "My Class")
9. 🚧 Lesson Plans / Logbook / T.O.D.

**PRIORITY YA CHINI (polepole):**
10. 🚧 Grades tracking (score history per student) + Submission Report
11. 🚧 Activity Control / Live Sessions
12. 🚧 Audit Trail + System Settings

**KANUNI ZA KUFUATA KILA MODULE MPYA:**
- ✅ API route zote ziwe na try/catch → `dbErrorResponse()`
- ✅ Kila route ya member inayohusu students/classes/subjects/attendance/grades/fees itumie `getTeacherScope(user)` (kutoka `@/lib/teachers`)
- ✅ UI — epuka `list ?? []` bila `useMemo` (hatari ya infinite render loop)
- ✅ Exam Type daima itokee `@/lib/examTypes` (SE/CA tuu)
- ✅ `students.admissionNo` — KAMWE usiweke `.unique()` peke yake (inabaki per-class)
- ✅ Usi-install `xlsx` kutoka npm plain — tumia SheetJS CDN URL
- ✅ Baada ya kubadilisha schema → `npx drizzle-kit push` au SQL ya mkono kwenye Neon
