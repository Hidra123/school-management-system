# 🧑‍💻 DEV — Maelezo ya Development

## Kuanza

```bash
npm install
cp .env.example .env      # weka DATABASE_URL
npx drizzle-kit push
npx -y tsx src/db/seed.ts
npm run dev
```

## Scripts

| Amri | Kazi |
|------|------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npx drizzle-kit push` | Sasisha schema kwenye DB |
| `npx -y tsx src/db/seed.ts` | Tengeneza admin account |

## Auth flow

1. `/login` → POST `/api/auth/login` (username + password)
2. Password inasomwa kwa SHA-256, inalinganishwa na `users.password`
3. Session (base64 JSON) inawekwa kwenye cookie `shulehub_session` (httpOnly)
4. `AuthProvider` inasoma `/api/auth/me` kila route change
5. `AppShell` inalinda routes:
   - Hakuna user → `/login`
   - `mustChangePassword` → `/profile`
   - Admin akijaribu member page → `/admin`
   - Member akijaribu `/admin/*` → `/`

Redirects zinatumia `window.location.href` (siyo `router.push`) ili cookie mpya isomwe upya.

## Kuongeza page mpya ya member

1. Tengeneza `src/app/<jina>/page.tsx`
2. Ongeza kwenye `MEMBER_SIDEBAR` ndani ya `src/lib/permissions.ts` na `permission` sahihi
3. Page itaonekana tu kwa watumiaji wenye ruhusa hiyo

## Kuongeza permission mpya

1. Ongeza kwenye `PERMISSION_GROUPS` (`src/lib/permissions.ts`)
2. Iongeze kwenye role presets zinazohitaji
3. `npx -y tsx src/db/seed.ts` ili admin apate permission mpya

## Kuongeza table mpya

1. Hariri `src/db/schema.ts`
2. `npx drizzle-kit push`
3. Tengeneza API route chini ya `src/app/api/`

## UI Components (`src/components/ui.tsx`)

`Badge`, `Modal`, `Field`, `SelectField`, `TextareaField`, `PasswordField`,
`StatCard`, `Spinner`, `Checkmark`, `ActionButton`, `useActionState`,
`Table/THead/TBody/TRow/TH/TD`, `EmptyState`, `Alert`.

```tsx
const { state, execute } = useActionState();
await execute(async () => { await fetch(...); });
<ActionButton state={state} onClick={...}>Save</ActionButton>
```

## Kuhamisha code kwenda Codespace

Sandbox inatengeneza `public/shulehub.tar.gz`:

```bash
find . -not -path './.git/*' -not -name '.git' -not -name '.' -delete 2>/dev/null
curl -L <PREVIEW_URL>/shulehub.tar.gz -o code.tar.gz && tar xzf code.tar.gz && rm code.tar.gz
npm install
```
