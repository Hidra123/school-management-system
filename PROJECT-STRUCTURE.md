# 🗂️ ShuleHub — Project Structure (LIVE CHART & ACCESS PASSPORT)

> **💡 JINSI YA KUTUMIA CHART HII KATIKA CHAT MPYA:**
> Nakili (copy) andiko hili lote na ulipaste mwanzoni mwa chat yoyote mpya.
> AI yoyote mpya inayosoma chart hii itaelewa mfumo wako mzima papo hapo:
> 1. Inajua jinsi ya kufikia **GitHub** na **Neon PostgreSQL** moja kwa moja bila kuuliza maswali.
> 2. Inajua muundo kamili wa faili zote 104+ zilizopo kwenye mradi.
> 3. Inajua kipi kimekamilika (✅), kipi kimeboreshwa hivi karibuni (🔧), na kipi bado (🚧).
> 4. Kazi ya mteja inabaki kuwa **kuangalia deploy pekee** kwenye Vercel — AI inafanya kila kitu na ku-push GitHub yenyewe!

---

## 🔑 ACCESS INFO — TAARIFA ZA KUINGIA (CRITICAL FOR NEW SESSIONS)

### 1. 🐙 GitHub Repository (Production Source of Truth)
- **Repo URL:** `https://github.com/Hidra123/school-management-system`
- **Main Branch:** `main`
- **Clone command kwenye sandbox:**
  ```bash
  git clone --depth 1 https://github.com/Hidra123/school-management-system /tmp/shulehub
  ```
- **Jinsi ya ku-push mabadiliko:**
  Push inafanyika moja kwa moja kupitia GitHub Contents API:
  `PUT https://api.github.com/repos/Hidra123/school-management-system/contents/<path>`
  kwa kutumia Personal Access Token (Fine-grained token yenye ruhusa ya `Contents: Read and write`).
  ⚠️ **USALAMA:** Token haihifadhiwi ndani ya faili za msimbo (code). Mteja anaitoa kwenye chat inapohitajika.

### 2. 🐘 Neon PostgreSQL Database (Production Live Database)
- **Connection String:**
  ```
  postgresql://neondb_owner:npg_q6pNKkW2jBQi@ep-winter-water-ayvokh3c-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require
  ```
- **Console:** `console.neon.tech` (SQL Editor)
- **Sandbox Testing:** Weka `DATABASE_URL` kwenye sandbox kusoma data halisi ya Neon:
  ```bash
  export NEON='postgresql://neondb_owner:npg_q6pNKkW2jBQi@ep-winter-water-ayvokh3c-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require'
  psql "$NEON" -c "SELECT count(*) FROM users;"
  ```
- **Kanuni ya Schema:** Kila `src/db/schema.ts` inapobadilika, AI inatakiwa kutekeleza mabadiliko hayo kwa SQL yenye `IF NOT EXISTS` / `IF EXISTS` kwenye Neon pia ili kusiwe na hitilafu za deploy.

### 3. 🔺 Vercel Hosting & Deployment
- **Project Name:** `shulehub-sms`
- **Uhakiki wa Deploy:** `vercel.com` → `shulehub-sms` → **Deployments**
- Kila commit inayoingia kwenye tawi la `main` GitHub inajenga kiotomatiki kwenye Vercel katika muda wa dakika 2-3.

### 4. 👤 Akaunti za Kuingia Kwenye Mfumo (Logins & Credentials)
- **Admin:** Username: `Admin` · Password: `Rash@1234`
- **Walimu / Members:** Username: `Check Number` (namba ya mtumishi) · Nenosiri la awali: `shulehub2025` (lazima kubadilishwa kwenye login ya kwanza)
- **Academic Master:** Username: `113635655` (Hidra Ramadhani Omari) — `staff_role = 'academic_master'` kwenye database ya Neon.

### 5. ⚡ Kanuni Zisizovunjika za Kusanidi Msimbo (Golden Rules)
1. **Push kupitia API:** AI inakamilisha na kupush mabadiliko moja kwa moja kupitia GitHub API — mteja hapaswi kukopi/kupaste faili kwa mkono.
2. **Uthibitishaji Kamili:** Kabla ya ku-push, hakikisha amri zote hizi 4 zimepita bila hitilafu yoyote:
   - `npx next typegen`
   - `npm exec tsc -- --noEmit --pretty false`
   - `npm run build`
   - `build_and_start` (platform healthcheck)
3. **Try/Catch & Error Handling:** Kila API route lazima ifungwe na `try/catch` na kutumia `dbErrorResponse(e, action)` kutoka `@/lib/apiError`.
4. **Scoping ya Walimu:** Kila route ya upande wa mwalimu inayohusu madarasa/masomo/wanafunzi/matokeo lazima itumie `getTeacherScope(user, { strictForAcademicMaster? })` kutoka `@/lib/teachers`.
5. **Exam Type (Chaguo 2 Tu):** Mfumo unatumia `SE` (School Examination) na `CA` (Continuously Assessment) PEKEE kutoka `@/lib/examTypes`.
6. **Namba za Udahili (Admission Numbers):** `students.admissionNo` ni ya kipekee **ndani ya darasa moja tu** (`unique(class_id, admission_no)`). KAMWE usiweke `.unique()` kwenye `admissionNo` peke yake.
7. **Maktaba ya Excel (`xlsx`):** Inatumia SheetJS CDN URL (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`) ndani ya `package.json`. KAMWE usi-install kutoka npm registry ya kawaida (inazuiliwa na Vercel).
8. **Upigaji Chapa (Printing):** Inatumia mbinu maalum ya **iframe print** (`printViaIframe` yenye timeout ya 350ms) kuhakikisha ripoti haitoki tupu (blank) wala kukatwa na browser.

---

## ⚡ MWANZO WA KILA SESSION — SCRIPT YA UHAKIKI
Kwenye sandbox, kimbiza script hii mara moja kuona kama sandbox inalingana 100% na GitHub na database ya Neon:
```bash
bash scripts/session-check.sh
```

---

## 📌 HISTORIA YA MABORESHO YALIYOKAMILIKA (CURRENT STATUS)

1. ✅ **Exam Type (SE | CA Tu):**
   - Examination panel (`ManageExaminationsTab`), Submit Scores (`/grades`), na Score Tracking (`/grades/tracking`) zote zinasoma chaguo 2 tu za `SE` na `CA` kutoka `@/lib/examTypes.ts`.
   - API zote za exams zinakataa thamani nyingine yoyote kwa `HTTP 400`.
   - Database ya Neon ina enum ya `exam_type` yenye `SE` na `CA`.

2. ✅ **Scoping Maalum ya Academic Master:**
   - **Students (`/students`):** Academic Master anaona madarasa **YOTE** na anaweza kuadmit wanafunzi popote bila kizuizi.
   - **Submit Scores (`/grades`):** Academic Master anabanwa kuona na kuingiza alama kwenye madarasa na masomo **ALIYOPEWA NA ADMIN TU** kupitia `strictForAcademicMaster: true`.
   - Neon: Mtumiaji `113635655` (Hidra Ramadhani Omari) amewekewa `staff_role = 'academic_master'`.

3. ✅ **Submit Scores Step-by-Step (`/grades`):**
   - Hatua 4 za mtiririko: **1) Select Class ➔ 2) Select Subject ➔ 3) Exam Category (SE/CA) ➔ 4) Exam Name (ACTIVE pekee) ➔ Jedwali la wanafunzi kupakia**.
   - Ikiwa hakuna mtihani ulio hai (active) kwa darasa hilo, Category inakuwa disabled ikiwa na onyo la Kiingereza: *"There is no ACTIVE exam for this class yet — please contact the Academic Master for further assistance."*
   - Vitufe 3 vya chini ya jedwali: **Clear**, **💾 Save Scores**, na **✏️ Edit** (inayofungua mode ya kurekebisha alama baada ya kuhifadhi).

4. ✅ **Attendance Tracking Centre & Monthly Register Print:**
   - Imetatuliwa hitilafu ya ruhusa: `/api/attendance/monthly`, `/api/attendance/report`, na `/api/attendance/days-saved` zinaruhusu `attendance.view` au `attendance.trackall` kupitia `requireAnyPermission()`.
   - Uchapishaji (Print) wa Monthly Register sasa ni A4 landscape safi, siku zote 30/31 zinaonekana bila kukatika, na sidebar/navbar haichapishwi.

5. ✅ **Score Tracking (`/grades/tracking`):**
   - Kadi 4 za takwimu: Total Assignments, Scores Submitted, Pending, na Completion Rate.
   - Vichujio: Class, Exam Type (SE/CA), Exam Category, na Academic Year.
   - Tab 3 kamili: **Submission Progress** (yenye progress bar kwa kila darasa), **Detailed Score View** (jedwali kamili lenye status ya kila somo), na **By Teacher** (kazi na asilimia ya kila mwalimu).
   - Mfumo wa uchapishaji (Print via Iframe) wa kisasa ukiwa na barua ya shule (letterhead), kadi za KPI, majedwali ya rangi, na sehemu za sahihi za Academic Master na Mkuu wa Shule — kila tab inachapisha ripoti yake binafsi!

6. ✅ **Mgawanyo wa Masomo kwa Madarasa (Matrix Assignment):**
   - Jedwali jipya la `teacher_subject_classes` linawawezesha walimu tofauti **kushare somo moja kwenye madarasa tofauti** bila kufutana (k.m. Mwalimu X: Kiswahili Form 1 & 2; Mwalimu Y: Kiswahili Form 3 & 4).
   - Inatambua masomo maalum ya madarasa mahususi (Civics: Form 3 & 4; Computer App: Form 1; Computer Science & Business: Form 1 & 2).
   - Modal ya **Manage Teachers ➔ 📚 Assign Subjects & Classes** imeboreshwa kuwa matrix kamili yenye checkbox kwa kila darasa.

7. ✅ **Timetable Kamili (`/timetable`):**
   - **General Timetable (🌐):** Ratiba kuu ya shule ya siku zote 5 (Jumatatu–Ijumaa), vipindi 1–9, Break (10:40–11:00), Lunch (13:00–13:30), Assembly (14:50–15:00), Extra Curriculum (15:00–16:30), RELIGIO (Jumatano), na MEWAKA (Ijumaa).
   - **Kodi Sanifu za Masomo:** Inasoma kodi fupi sahihi (`MATH`, `KISW`, `ENG`, `PHY`, `CHEM`, `BIO`, `GEO`, `CIV`, `B/STD`, `CSC`, `HIS/TZ`, `HIS`) — hakuna tena neno "SUBJ".
   - **Uhusiano wa Walimu:** Inasoma kiotomatiki walimu halisi waliopangiwa kila somo kwenye darasa husika kutoka `teacher_subject_classes` (k.m. Form 1 Math inaonyesha Luchius Shumbusho Mathias, Form 2 Math inaonyesha Hidra Ramadhani Omari).
   - **Class Timetable (🏫):** Ratiba ya darasa lolote lililochaguliwa ikiwa na Break, Lunch, Assembly, Extra Curriculum, RELIGIO, na MEWAKA.
   - **Teacher Timetable (👨‍🏫):** Ratiba binafsi ya mwalimu yenye kodi za masomo, madarasa, na takwimu za vipindi vya kufundisha na vya kupumzika (Free).
   - **🖨️ Uchapishaji (Print/PDF):** Print 3 za kipekee (General Timetable, Class Timetable, Teacher Timetable) zenye letterhead rasmi ya Halmashauri na Mangi Wingia Secondary School, kodi za masomo, majina ya walimu, na sehemu za sahihi!
   - **✏️ Slot Editing & Settings:** Academic Master anaweza kuhariri kipindi chochote kwa kubonyeza, au kurekebisha majina na nyakati za shule kupitia **⚙️ Timetable Settings**.

---

## 🗂️ RAMANI KAMILI YA MUUNDO WA FAILI (104+ FILES)

> **LEGEND:**  
> ✅ = Inafanya kazi kikamilifu  
> 🔧 = Imeboreshwa/Imejengwa hivi karibuni  
> 🚧 = Bado haijajengwa (Stub / Roadmap)  
> ⚠️ = Inafanya kazi lakini ina pengo linalojulikana  

```
shulehub-sms/
│
├── .env                                  # DATABASE_URL (Neon), SESSION_SECRET
├── package.json                          # Next 16, React 19, Drizzle ORM, xlsx@SheetJS CDN
├── tsconfig.json / next.config.ts        # TypeScript & App Router config
├── drizzle.config.ts                     # Drizzle Kit migration config
├── vercel.json                           # Vercel deployment configuration
├── README.md / DEPLOY.md / DEV.md
├── PROJECT-STRUCTURE.md                  # 🌟 CHART HII NA TAARIFA ZOTE ZA ACCESS
├── scripts/
│   └── session-check.sh                  # ⚡ Script ya kuthibitisha Neon + GitHub sync
│
└── src/
    ├── app/                              # ═════════ PAGES & ROUTES ═════════
    │   ├── layout.tsx                    # Root layout
    │   ├── globals.css                   # Tailwind 4, scrollbars, na @media print styles
    │   ├── page.tsx                      # ✅ Member Dashboard (scoped stats)
    │   │
    │   ├── login/
    │   │   ├── page.tsx                  # ✅ Login form moja (Staff/Admin toggle, Check Number)
    │   │   └── layout.tsx
    │   ├── profile/page.tsx              # ✅ Badilisha nenosiri (lazima mara ya kwanza)
    │   │
    │   │   ──────── 👑 ADMIN ONLY ────────
    │   │
    │   ├── admin/
    │   │   ├── page.tsx                  # ✅ Admin Dashboard (takwimu za shule nzima)
    │   │   ├── classes/page.tsx          # ✅ Manage Classes (CRUD madarasa)
    │   │   ├── subjects/page.tsx         # 🔧 Manage Subjects (CRUD + orodha ya walimu wanaoshare)
    │   │   ├── teachers/page.tsx         # 🔧 Manage Teachers (CRUD, auto login, Assign modal)
    │   │   ├── assignments/page.tsx      # ✅ Add Staff Member (ngazi zote na ruhusa)
    │   │   ├── profile/page.tsx          # ✅ Admin Profile & Password Change
    │   │   ├── admissions/page.tsx       # ✅ Approve Admissions & Academic Work (4 tabs: Student Admissions, Manage Exams, Behavioural Assessments, Timetable Review)
    │   │   ├── monitor/page.tsx          # ✅ Monitor Dashboards & Staff Accounts (Master Lockdown/Enable All, single account toggle, reset password, permissions inspector)
    │   │   ├── parents/page.tsx          # 🚧 STUB: Orodha ya wazazi
    │   │   ├── parent-assignments/page.tsx # 🚧 STUB: Wazazi na watoto wao
    │   │   ├── activity/page.tsx         # 🚧 STUB: Shughuli za watumiaji
    │   │   ├── sessions/page.tsx         # 🚧 STUB: Vipindi vilivyo hewani
    │   │   ├── audit/page.tsx            # 🚧 STUB: Ukaguzi wa mfumo
    │   │   └── settings/page.tsx         # 🚧 STUB: Mipangilio ya jumla
    │   │
    │   │   ──────── 👨‍🏫 MEMBER (Walimu na Watumishi) ────────
    │   │
    │   ├── students/page.tsx             # 🔧 Wanafunzi (CRUD, Excel Import, Academic Master anaona wote)
│   ├── map-students/page.tsx         # ✅ Map Students to Subjects (Optional subjects, student enrollment matrix, Submit Scores integration)
    │   ├── teachers/page.tsx             # ✅ Teachers view kwa wanachama
    │   ├── classes/page.tsx              # ✅ Classes view kwa wanachama
    │   ├── subjects/page.tsx             # ✅ Subjects view kwa wanachama
    │   │
    │   ├── attendance/page.tsx           # ✅ Mahudhurio ya kila siku (Daily, Monthly, Report, Days Saved)
    │   ├── attendance-tracking/page.tsx  # 🔧 Ufuatiliaji wa shule nzima (Admin & Academic Master)
    │   │
    │   ├── exams/page.tsx                # 🔧 Examinations (Exam Type: SE au CA tu, routines, matokeo)
    │   │
    │   ├── grades/
    │   │   ├── page.tsx                  # 🔧 Submit Scores (Step-by-step 1–4, SE/CA active, Edit mode)
    │   │   ├── tracking/page.tsx         # 🔧 Score Tracking (Kadi 4, filters, tabs 3, iframe print)
    │   │   └── report/page.tsx           # 🚧 STUB: Ripoti ya uwasilishaji alama
    │   │
    │   ├── timetable/page.tsx            # 🔧 Timetable (General, Class, Teacher, Print 3, Edit, Settings)
│   ├── year-progression/page.tsx     # ✅ Academic Year Progression (Active Year Switcher, Class Promotion Engine Form 1-4, Alumni Archive)
    │   │
    │   ├── fees/page.tsx                 # ✅ ⚠️ Ada (bado haijawekewa scoping ya walimu)
    │   ├── lesson-plans/page.tsx         # 🚧 STUB: Maazimio ya kazi / Masomo
    │   ├── logbook/page.tsx              # 🚧 STUB: Kitabu cha kumbukumbu ya masomo
    │   ├── tod/page.tsx                  # ✅ Teacher On Duty (T.O.D.) Report — 10 criteria presets, auto-calculating attendance (Boys/Girls/Presents), initials signature, settings & exact official A4 print
    │   ├── messages/page.tsx             # 🚧 STUB: Ujumbe wa ndani wa shule
    │   ├── assignments/page.tsx          # 🚧 STUB: Kazi za darasani kwa wanafunzi
    │   │
    │   └── api/                          # ═════════ API ROUTE HANDLERS ═════════
    │       ├── health/route.ts           # ✅ GET /api/health
    │       ├── stats/route.ts            # ✅ GET /api/stats (takwimu kulingana na daraja)
    │       │
    │       ├── auth/
    │       │   ├── login/route.ts        # ✅ POST: kuingia kwenye mfumo
    │       │   ├── logout/route.ts       # ✅ POST: kutoka kwenye mfumo
    │       │   ├── me/route.ts           # ✅ GET: maelezo ya mtumiaji aliyepo hewani
    │       │   └── change-password/route.ts # ✅ PUT: badilisha nenosiri
    │       │
    │       ├── admin/members/
    │       │   ├── route.ts              # ✅ GET, POST watumishi wote
    │       │   └── [id]/route.ts         # ✅ GET, PUT, DELETE mtumishi
    │       ├── admin/admissions/route.ts # ✅ GET, PUT: idhinisha udahili, mitihani, na tathmini ya tabia
    │       ├── admin/monitor/route.ts    # ✅ GET, POST: udhibiti wa akaunti, lockdown na single toggle
    │       │
    │       ├── students/
    │       │   ├── route.ts              # 🔧 GET, POST (admissionNo per-class, ?strict=1 support)
    │       │   ├── [id]/route.ts         # ✅ GET, PUT, DELETE mwanafunzi
    │       │   └── bulk-import/route.ts  # ✅ POST: kuingiza wanafunzi kwa Excel/CSV
    │       │
    │       ├── teachers/
    │       │   ├── route.ts              # 🔧 GET, POST (inahesabu masomo/madarasa ya matrix)
    │       │   ├── [id]/route.ts         # ✅ GET, PUT, DELETE mwalimu
    │       │   └── [id]/assignments/route.ts # 🔧 GET, PUT matrix ya masomo na madarasa
    │       │
    │       ├── classes/
    │       │   ├── route.ts              # 🔧 GET (?strict=1), POST
    │       │   └── [id]/route.ts         # ✅ GET, PUT, DELETE darasa
    │       │
    │       ├── subjects/
    │       │   ├── route.ts              # 🔧 GET (?strict=1, teacherDisplay ya matrix), POST
    │       │   └── [id]/route.ts         # ✅ GET, PUT, DELETE somo
    │       │
    │       ├── attendance/
    │       │   ├── route.ts              # ✅ GET, POST (asubuhi na mchana)
    │       │   ├── monthly/route.ts      # 🔧 GET (inaruhusu attendance.view au trackall)
    │       │   ├── report/route.ts       # 🔧 GET (inaruhusu attendance.view au trackall)
    │       │   ├── days-saved/route.ts   # 🔧 GET (inaruhusu attendance.view au trackall)
    │       │   ├── school-overview/route.ts # ✅ GET: muhtasari wa shule nzima
    │       │   ├── daily-summary/route.ts   # ✅ GET: muhtasari wa siku
    │       │   ├── at-risk/route.ts      # ✅ GET: wanafunzi walio hatarini
    │       │   └── annual-overview/route.ts # ✅ GET: mahudhurio ya mwaka
    │       │
    │       ├── exams/
    │       │   ├── route.ts              # 🔧 GET, POST (uthibitishaji wa SE | CA pekee)
    │       │   ├── [id]/route.ts         # 🔧 GET, PUT (SE | CA pekee), DELETE
    │       │   ├── active/route.ts       # ✅ GET: mitihani iliyo hai (status='active')
    │       │   ├── remarks/route.ts      # ✅ GET, POST maoni ya mwanafunzi
    │       │   ├── results/route.ts      # ✅ GET: matokeo ya darasa, division na GPA
    │       │   ├── results/student/route.ts # ✅ GET: kadi ya ripoti ya mwanafunzi
    │       │   └── settings/route.ts     # ✅ GET, PUT muda wa kufungua uingizaji alama
    │       │
    │       ├── grades/
    │       │   ├── route.ts              # 🔧 GET, POST (strict scope, subjectClassAllowed)
    │       │   ├── [id]/route.ts         # 🔧 GET, PUT, DELETE (strict scope)
    │       │   └── tracking/route.ts     # 🔧 GET: Score tracking data na assignments
    │       │
    │       ├── timetable/
    │       │   ├── route.ts              # 🔧 GET: Ratiba kuu, slots, walimu na settings
    │       │   ├── slot/route.ts         # 🔧 PUT, DELETE kipindi cha ratiba
    │       │   ├── settings/route.ts     # 🔧 PUT mipangilio ya nyakati na barua ya shule
    │       │   └── class/route.ts        # 🔧 POST, PUT, DELETE mikondo na madarasa ya ratiba
    │       │
    │       ├── tod/
    │       │   └── route.ts              # ✅ GET, POST, DELETE: Teacher On Duty reports
    │       │
    │       └── fees/
    │           ├── route.ts              # ✅ GET, POST ⚠️ haijascope
    │           └── [id]/route.ts         # ✅ GET, PUT, DELETE
    │
    ├── components/                       # ═════════ UI & REUSABLE BLOCKS ═════════
    │   ├── ui.tsx                        # Badge, Modal, Field, StatCard, Loader, EmptyState, inputCls
    │   ├── AuthProvider.tsx              # React Context ya uthibitisho wa mtumiaji
    │   ├── AppShell.tsx                  # Ulinzi wa kurasa, sidebar, na redirects
    │   ├── Sidebar.tsx                   # Menyu ya kushoto (Admin vs Member kwa permissions)
    │   ├── ChangePasswordForm.tsx        # Fomu ya kubadilisha nenosiri
    │   ├── AssignSubjectsClassesModal.tsx# 🔧 Matrix ya kupanga masomo na madarasa kwa mwalimu
    │   ├── ImportStudentsModal.tsx       # Modal ya kupakia wanafunzi kwa Excel/CSV
    │   │
    │   ├── attendance/                   # DailyEntryTab, MonthlyRegisterTab, AttendanceReportTab, DaysSavedTab
    │   ├── attendance-tracking/          # SchoolOverviewTab, DailySummaryTab, AtRiskStudentsTab
    │   └── exams/                        # ManageExaminationsTab 🔧 (SE|CA), ExamRoutineResultsTab,
    │                                     # ClassResultReport, StudentReportCard
    │
    ├── db/                               # ═════════ DATABASE (Drizzle ORM) ═════════
    │   ├── index.ts                      # Drizzle Client inayounganishwa na Neon
    │   ├── schema.ts                     # 🔧 Schema kamili ya jedwali 17 za PostgreSQL
    │   └── seed.ts                       # Uwekaji wa akaunti ya Admin
    │
    └── lib/                              # ═════════ UTILITIES & HELPERS ═════════
        ├── auth.ts                       # 🔧 hashPassword, session, requirePermission, requireAnyPermission
        ├── permissions.ts                # 🔧 Orodha ya ruhusa 39, ROLE_PRESETS
        ├── teachers.ts                   # 🔧 getTeacherScope, subjectClassAllowed, strictForAcademicMaster
        ├── examTypes.ts                  # 🔧 EXAM_TYPES [SE, CA], validation na kadi za rangi
        ├── examGrading.ts                # Ubadilishaji wa alama kuwa madaraja (A-F), pointi, na division
        ├── attendanceHelpers.ts          # Mipangilio ya tarehe na asilimia za mahudhurio
        ├── apiError.ts                   # dbErrorResponse wrapper sanifu
        └── utils.ts                      # useFetch, postJSON, putJSON, delJSON, shortDate, cls
```

---

## 📌 RATIBA YA KAZI ZINAZOFUATA (PRIORITY ROADMAP)

### Priority ya Juu (Inayofuata Sasa):
1. ⚠️ **Fees Module Scoping:** Kuweka ulinzi wa `getTeacherScope` kwenye `/api/fees` ili mwalimu aone ada za wanafunzi wa madarasa yake tu, wakati Admin na Mhasibu (Accountant) wanaona shule nzima.
2. 🚧 **Exams Routine Publisher:** Kukamilisha jedwali la tarehe za mitihani na uchapishaji wa ratiba ya mitihani darasani.

### Priority ya Kati (Kipindi Kijacho):
3. 🚧 **Admissions Module:** Ukurasa wa Admin kuidhinisha au kukataa wanafunzi wanaoomba kujiunga (`/admin/admissions`).
4. 🚧 **School Monitor:** Dashibodi ya ufuatiliaji wa shule mzima moja kwa moja (`/admin/monitor`).
5. 🚧 **Parents Management:** Usimamizi wa mawasiliano ya wazazi na kuwaunganisha na watoto wao (`/admin/parents`).
6. 🚧 **Messages:** Mfumo wa kutumiana ujumbe wa ndani kati ya walimu na uongozi (`/messages`).
7. 🚧 **Assignments (Homework):** Walimu kuweka kazi za nyumbani kwa wanafunzi wa madarasa yao (`/assignments`).
8. 🚧 **Lesson Plans, Logbook, na T.O.D.:** Maazimio ya kazi, kitabu cha kumbukumbu cha somo, na ripoti ya mwalimu wa zamu.

### Priority ya Chini:
9. 🚧 **Grades Submission Report & Score History:** Ufuatiliaji wa kina wa historia ya alama za mwanafunzi miaka yote.
10. 🚧 **Live Sessions, Activity Log & Audit Trail:** Kumbukumbu ya nani aliingia na kufanya nini kwenye mfumo.
