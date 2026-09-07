# ⚡ QUICK DEPLOY — Copy & Paste

Amri zote kwa mpangilio. Badilisha `Hidra123` na jina lako la GitHub kama ni tofauti.

---

## 1️⃣ Weka code kwenye GitHub

```bash
# hakikisha upo kwenye folder ya project
git init
git branch -M main

git add -A
git commit -m "ShuleHub SMS: full system (auth, admin panel, teacher accounts)"

# unganisha na repo yako
git remote add origin https://github.com/Hidra123/school-management-system.git

# kama remote ipo tayari, tumia hii badala yake:
# git remote set-url origin https://github.com/Hidra123/school-management-system.git

git push -u origin main
```

> Ukiulizwa password: tumia **Personal Access Token** (Settings → Developer settings → Tokens → Generate new token (classic) → scope `repo`).

---

## 2️⃣ Andaa Database (Neon)

```bash
export DATABASE_URL="postgresql://neondb_owner:npg_q6pNKkW2jBQi@ep-winter-water-ayvokh3c-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require"

npx drizzle-kit push        # tengeneza/sasisha tables
npx -y tsx src/db/seed.ts   # tengeneza admin: Admin / Rash@1234
```

⚠️ Ondoa `&channel_binding=require` kama Neon wamekupa nayo.

---

## 3️⃣ Deploy Vercel

### Njia A — Dashboard (rahisi)

1. Nenda https://vercel.com/new
2. **Import** repo `school-management-system`
3. Project name: `shulehub-sms`
4. **Environment Variables** → ongeza:
   - Name: `DATABASE_URL`
   - Value: connection string ya Neon (ile ile ya juu)
   - Environments: ✅ Production ✅ Preview ✅ Development
5. Bonyeza **Deploy**

### Njia B — CLI

```bash
npm i -g vercel
vercel login
vercel link           # chagua/tengeneza project "shulehub-sms"

vercel env add DATABASE_URL production
vercel env add DATABASE_URL preview
vercel env add DATABASE_URL development

vercel --prod
```

---

## 4️⃣ Hakikisha imefanya kazi

```bash
curl https://shulehub-sms.vercel.app/api/health
# ➜ {"ok":true}
```

Kisha fungua `https://shulehub-sms.vercel.app/login` → Username `Admin`, Password `Rash@1234`.

---

## 🔄 Updates baadaye

```bash
git add -A
git commit -m "maelezo ya mabadiliko"
git push
# Vercel ita-deploy yenyewe ✅
```

Kama umebadilisha `src/db/schema.ts`:

```bash
export DATABASE_URL="postgresql://...?sslmode=require"
npx drizzle-kit push
```
