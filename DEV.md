# 🧪 Development Guide — Test Before Publishing

Use GitHub Codespace to test changes BEFORE pushing to Netlify.
This saves your Netlify build credits.

## Workflow

```
[Arena Sandbox] → download → [Codespace] → test locally → happy? → git push → [Netlify auto-deploys]
```

---

## Step 1: Open Codespace

1. Go to https://github.com/Hidra123/school-management-system
2. Click green **"<> Code"** button
3. Click **"Codespaces"** tab
4. Click your existing codespace (or "Create codespace on main")

---

## Step 2: Download New Code from Arena

```bash
find . -not -path './.git/*' -not -name '.git' -not -name '.' -delete 2>/dev/null
curl -L PREVIEW_URL/shulehub.tar.gz -o code.tar.gz && tar xzf code.tar.gz && rm code.tar.gz
```

---

## Step 3: Set Database URL

```bash
export DATABASE_URL="YOUR_NEON_CONNECTION_STRING"
```

---

## Step 4: Install & Run Locally

```bash
npm install
npm run dev
```

Codespace will show a popup: **"Open in Browser"** — click it!
You will see the app running at a URL like `https://xxxx-3000.app.github.dev`

Test everything: login, dashboard, add students, etc.

---

## Step 5: Happy? Push to Netlify

Only when everything works:

```bash
npm run build
```

If build succeeds:

```bash
git add -A && git commit -m "description of changes" && git push
```

Netlify will auto-deploy. Done!

---

## Step 5b: Not Happy? Don't push!

Just go back to Arena, ask for fixes, download again (Step 2), and test again.
No Netlify credits wasted!

---

## Quick Reference

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server (with hot reload) |
| `npm run build` | Test production build |
| `npx drizzle-kit push` | Push schema changes to database |
| `npx tsx src/db/seed.ts` | Load sample data |
| `git push` | Deploy to Netlify |
