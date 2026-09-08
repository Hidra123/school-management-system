# 🚀 Quick Deploy Guide — Vercel CLI (Easiest Method)

## One-Time Setup (fanya mara moja tu)

### 1. Install Node.js
Download from: https://nodejs.org (LTS version)

### 2. Install Vercel CLI
Open terminal/command prompt:
```bash
npm install -g vercel
```

### 3. Login to Vercel
```bash
vercel login
```
It will open browser — sign in with GitHub.

---

## Deploy (kila wakati unapotaka ku-publish)

### Open terminal in your project folder, then:
```bash
vercel --prod
```

THAT'S IT! One command = deployed! 🎉

First time it will ask:
- Set up and deploy? → Y
- Which scope? → your account
- Link to existing project? → N
- Project name? → shulehub (or any name)
- Directory? → ./
- Override settings? → N

After that, every time just: `vercel --prod`

---

## Edit & Redeploy

1. Edit files in VS Code
2. Save
3. Run: `vercel --prod`
4. Done! New version is live in 60 seconds!

---

## Environment Variables (first time only)

Go to vercel.com → your project → Settings → Environment Variables:
- Key: DATABASE_URL
- Value: your Neon connection string
