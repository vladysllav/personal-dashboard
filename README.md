# Personal Dashboard

Goals and habits, kept by hand — on every device you use.

A single-user Next.js dashboard: goals with pace tracking, habits with streaks
and a consistency grid. Data lives in Postgres behind a GitHub sign-in, so the
same dashboard follows you from laptop to phone.

- **Framework** — Next.js 15 (App Router, React 19)
- **Database** — Neon (serverless Postgres) via Drizzle ORM
- **Auth** — Auth.js v5, GitHub OAuth, restricted to an allowlist
- **Styling** — CSS Modules and design tokens (see `DESIGN.md`)

---

## How it works

The client keeps the whole dashboard in a reducer and paints changes
immediately. Every change is also sent to the server as a **sealed action** —
ids, timestamps and toggles are all resolved on the client before the action
travels (`lib/sync.ts`), so replaying one is harmless and the two sides can
never disagree about which entry was just added.

```
component → dispatch(intent) → seal() → reducer   (instant, optimistic)
                                     ↘ applyAction() → Postgres
```

Server writes are validated with zod and scoped to the signed-in user; nothing
trusts an id from the payload without first proving ownership
(`lib/server/actions.ts`).

---

## Setup

You need a [Neon](https://neon.tech) account, a GitHub OAuth app, and Node 22+.

### 1. Database

Create a Neon project, then copy the **pooled** connection string (the host
containing `-pooler`) from the Neon dashboard.

### 2. GitHub OAuth app

**Settings → Developer settings → OAuth Apps → New OAuth App**

| Field | Value |
| --- | --- |
| Homepage URL | `http://localhost:3000` |
| Authorization callback URL | `http://localhost:3000/api/auth/callback/github` |

Generate a client secret and keep both values to hand. (After deploying, either
update these to your production URL or create a second app for it — an OAuth app
accepts only one callback URL.)

### 3. Environment

```bash
cp .env.example .env.local
npx auth secret          # writes AUTH_SECRET into .env.local
```

Fill in the rest:

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string |
| `AUTH_SECRET` | Session cookie signing key |
| `AUTH_GITHUB_ID` | OAuth app client id |
| `AUTH_GITHUB_SECRET` | OAuth app client secret |
| `ALLOWED_GITHUB_LOGINS` | Comma-separated GitHub logins allowed in |

`ALLOWED_GITHUB_LOGINS` **fails closed**: leave it empty and nobody can sign in,
including you. That is deliberate — a misconfigured deploy locks the door rather
than leaving a personal dashboard writable by anyone who finds the URL.

### 4. Create the tables and run

```bash
npm install
npm run db:migrate
npm run dev
```

---

## Deploying to Vercel

1. Import the repository at [vercel.com/new](https://vercel.com/new).
2. Add all five environment variables from `.env.local` to the project.
3. Deploy.
4. Update the GitHub OAuth app's homepage and callback URLs to the deployed
   domain (`https://<your-app>.vercel.app/api/auth/callback/github`).
5. Run `npm run db:migrate` once against the production database — Neon is the
   same database in both cases unless you created a second project.

Vercel's free tier and Neon's free tier both comfortably fit a dashboard this
size, and Neon scales to zero when idle.

---

## Bringing over old data

Earlier versions kept everything in the browser's `localStorage`. Open
**`/import`** in the browser that has that data. It lists the goals it finds and
imports the one you pick — habits and preferences are left behind.

The screen is only useful once; nothing links to it.

---

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | Generate a migration after editing `lib/db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Browse the database |

---

## Known limits

- **Last write wins.** Two devices editing the same goal at the same moment will
  have one overwrite the other. There is no conflict resolution.
- **No live sync.** A change made on your phone shows up on your laptop after a
  reload, not instantly.
- `npm audit` reports advisories in `postcss` and `sharp`, both pinned by Next
  itself, plus a dev-only `esbuild` one from `drizzle-kit`. Neither production
  path is reachable here: all CSS is first-party and `next/image` is unused.
