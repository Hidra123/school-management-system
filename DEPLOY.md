# 🚀 ShuleHub — Vercel Deployment Guide

## One-Time Setup

### 1. Install Node.js
Download from https://nodejs.org (LTS version)

### 2. Install Vercel CLI
```bash
npm install -g vercel
```

### 3. Login to Vercel
```bash
vercel login
```

### 4. Set DATABASE_URL
```bash
vercel env add DATABASE_URL
```
Paste your Neon connection string when prompted.
Select: Production, Preview, Development → all three.

### 5. First Deploy
```bash
vercel --prod
```

---

## Edit & Redeploy

1. Open project folder in VS Code
2. Edit any file
3. Save
4. Terminal: `vercel --prod`
5. Done! Live in 60 seconds.

---

## Local Development

```bash
npm install
echo 'DATABASE_URL=your_neon_connection_string' > .env
npm run dev
```
Open http://localhost:3000
