# 🚀 DEPLOY — GitHub + Neon + Vercel (hatua kwa hatua)

---

## SEHEMU 1 — GitHub

### 1.1 Angalia kama git ipo

```bash
git status
```

- Ukiona `fatal: not a git repository` → endelea na 1.2
- Ukiona orodha ya files → rukia hadi 1.3

### 1.2 Anzisha repository

```bash
git init
git branch -M main
```

### 1.3 Weka jina na email (mara moja tu)

```bash
git config --global user.name "Hidra123"
git config --global user.email "email-yako@example.com"
```

### 1.4 Hakikisha `.env` HAIENDI GitHub

```bash
cat .gitignore | grep .env
```

Lazima uone `.env`. Project hii tayari ina `.gitignore` sahihi — `node_modules`, `.next`, `.env`, na `*.tar.gz` hazitapelekwa.

### 1.5 Commit

```bash
git add -A
git commit -m "ShuleHub SMS: full system"
```

### 1.6 Unganisha na GitHub

```bash
git remote add origin https://github.com/Hidra123/school-management-system.git
git push -u origin main
```

**Kama remote ipo tayari:**

```bash
git remote set-url origin https://github.com/Hidra123/school-management-system.git
git push -u origin main
```

**Kama GitHub inakataa (rejected / non-fast-forward):**

```bash
git pull origin main --allow-unrelated-histories
# tatua conflicts kama zipo, kisha:
git add -A
git commit -m "merge"
git push -u origin main
```

**Kama unataka ku-overwrite kila kitu kilichopo GitHub:**

```bash
git push -u origin main --force
```

### 1.7 Authentication

GitHub haikubali password ya kawaida. Tumia **Personal Access Token**:

1. GitHub → **Settings** → **Developer settings**
2. **Personal access tokens** → **Tokens (classic)** → **Generate new token**
3. Scope: ✅ `repo`
4. Copy token → itumie kama *password* wakati wa `git push`

Au tumia GitHub CLI:

```bash
gh auth login
```

---

## SEHEMU 2 — Neon Database

### 2.1 Pata connection string

Neon Dashboard → project yako → **Connection string** → chagua **Pooled connection**.

```
postgresql://neondb_owner:npg_q6pNKkW2jBQi@ep-winter-water-ayvokh3c-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require
```

> ⚠️ **MUHIMU:** ondoa `&channel_binding=require` kama ipo — `pg` driver hai-support.

### 2.2 Tengeneza tables

```bash
export DATABASE_URL="postgresql://neondb_owner:npg_q6pNKkW2jBQi@ep-winter-water-ayvokh3c-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require"

npx drizzle-kit push
```

Utaona `[✓] Changes applied`.

### 2.3 Tengeneza admin account

```bash
npx -y tsx src/db/seed.ts
```

Output:

```
✅ Admin account created (id: 1)
🔑 35 permissions granted to admin
   Login  ->  Username: Admin
             Password: Rash@1234
```

Seed ni **idempotent** — unaweza kuiendesha mara nyingi bila error. Haiweki sample data.

---

## SEHEMU 3 — Vercel

### 3.1 Import project

1. https://vercel.com/new
2. **Add GitHub Account** (kama bado) → ruhusu Vercel kuona repo zako
3. Chagua `school-management-system` → **Import**

### 3.2 Configure

| Setting | Value |
|---------|-------|
| Project Name | `shulehub-sms` |
| Framework Preset | Next.js (auto) |
| Root Directory | `./` |
| Build Command | `next build` (auto) |
| Install Command | `npm install` (auto) |

### 3.3 Environment Variables (LAZIMA)

Kabla ya kubonyeza Deploy, ongeza:

| Key | Value | Environments |
|-----|-------|--------------|
| `DATABASE_URL` | connection string ya Neon | Production, Preview, Development |

Bila hii build itashindwa na `DATABASE_URL is required`.

### 3.4 Deploy

Bonyeza **Deploy**. Subiri ~2 dakika.

### 3.5 Hakikisha

```bash
curl https://shulehub-sms.vercel.app/api/health
# {"ok":true}
```

Fungua `/login` → `Admin` / `Rash@1234`.

---

## SEHEMU 4 — Baada ya Deploy

### Kuongeza mwalimu

1. Login kama Admin
2. **Manage Teachers** → **+ Add Teacher**
3. Jaza jina + Check Number (username)
4. System ita-tengeneza **user account moja kwa moja** na password `shulehub2025`
5. Username na password vinaonekana kwenye teacher card (bonyeza 👁️ kuona password)
6. Mwalimu akiingia mara ya kwanza → analazimika kubadilisha password

### Update code

```bash
git add -A
git commit -m "maelezo"
git push
```

Vercel ita-deploy yenyewe. ✅

### Schema ikibadilika

```bash
export DATABASE_URL="postgresql://...?sslmode=require"
npx drizzle-kit push
```

---

## 🧯 Troubleshooting

| Tatizo | Suluhisho |
|--------|-----------|
| `DATABASE_URL is required` (Vercel build) | Ongeza env var kwenye Vercel → Settings → Environment Variables → **Redeploy** |
| `self signed certificate` / `SSL` error | Ondoa `&channel_binding=require`; `src/db/index.ts` tayari inaweka `rejectUnauthorized: false` |
| `password authentication failed` | Copy connection string upya kutoka Neon |
| `too many connections` | Tumia **pooled** connection string (yenye `-pooler`) |
| Login inasema Invalid | Endesha `npx -y tsx src/db/seed.ts` tena |
| `git push` rejected | `git pull origin main --allow-unrelated-histories` kisha push |
| Vercel build error: `Module not found` | `rm -rf node_modules package-lock.json && npm install` kisha commit `package-lock.json` |
