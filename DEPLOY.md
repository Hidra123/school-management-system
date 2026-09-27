# 🚀 ShuleHub — Vercel Deployment Guide

## 📋 Quick Start

**For comprehensive Neon + Vercel setup, see [NEON-VERCEL-DEPLOY.md](./NEON-VERCEL-DEPLOY.md)**

This guide provides a quick deployment process once you have your Neon database ready.

---

## Prerequisites

1. **Neon Database**: Create a free Neon PostgreSQL account at https://neon.tech
2. **Node.js**: Install LTS version from https://nodejs.org
3. **Neon Connection String**: Get your `DATABASE_URL` from Neon dashboard

---

## One-Time Setup

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```
- This will open your browser for authentication
- Sign in with GitHub or your email

### 3. Set DATABASE_URL Environment Variable
```bash
vercel env add DATABASE_URL
```
- Paste your Neon connection string when prompted
- Select: Production, Preview, Development → all three
- Connection string format: `postgresql://neondb_owner:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`

### 4. First Deploy
```bash
vercel --prod
```

---

## Quick Deployment Process

1. **Set up environment**:
   ```bash
   npm install
   ```

2. **Test database connection** (optional):
   ```bash
   # Set DATABASE_URL in .env file first
   npm run db:check
   ```

3. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

The first deployment will ask:
- Set up and deploy? → Y
- Which scope? → your account
- Link to existing project? → N (first time)
- Project name? → shulehub (or your preferred name)
- Directory? → ./
- Override settings? → N

---

## Edit & Redeploy

After making changes to your code:

1. **Commit changes**:
   ```bash
   git add .
   git commit -m "Your commit message"
   ```

2. **Deploy**:
   ```bash
   vercel --prod
   ```

3. **Done!** New version is live in 60 seconds.

---

## Local Development

```bash
# Install dependencies
npm install

# Create .env file with your Neon connection string
echo 'DATABASE_URL=your_neon_connection_string' > .env

# Start development server
npm run dev
```

Open http://localhost:3000

---

## Environment Variables

Required environment variable:
- `DATABASE_URL`: Your Neon PostgreSQL connection string

Set this in:
- Local: `.env` file (see `.env.example`)
- Vercel: Dashboard → Settings → Environment Variables

---

## Troubleshooting

### Build Failures
```bash
# Check build logs
vercel logs --prod

# Test local build
npm run build
```

### Database Connection Issues
- Ensure `DATABASE_URL` includes `?sslmode=require`
- Verify Neon database is active
- Check Vercel environment variables are set correctly

### Common Issues
- **Database URL not found**: Set `DATABASE_URL` in Vercel dashboard
- **Connection timeout**: Check Neon IP allowlist settings
- **Build errors**: Check that all dependencies are in package.json

---

## Additional Commands

```bash
# Check database connection
npm run db:check

# Push schema changes to database
npm run db:push

# Generate migration files
npm run db:generate

# View Vercel logs
vercel logs --prod

# View deployment list
vercel list
```

---

## Detailed Setup

For complete setup instructions including:
- Neon database creation
- Detailed configuration steps
- Security best practices
- Monitoring and debugging

See the comprehensive guide: **[NEON-VERCEL-DEPLOY.md](./NEON-VERCEL-DEPLOY.md)**
